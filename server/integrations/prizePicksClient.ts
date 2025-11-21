import { IntegrationClient, RateLimitConfig } from './integrationClient';

interface PrizePicksProjection {
  type: 'projection';
  id: string;
  attributes: {
    line_score: number;
    stat_type: string;
    description?: string;
    start_time: string;
    odds_type: string;
    status: string;
  };
  relationships: {
    new_player: {
      data: {
        id: string;
        type: 'new_player';
      };
    };
    league: {
      data: {
        id: string;
        type: 'league';
      };
    };
  };
}

interface PrizePicksPlayer {
  type: 'new_player';
  id: string;
  attributes: {
    name: string;
    team?: string;
    team_name?: string;
    position?: string;
    image_url?: string;
  };
}

interface PrizePicksLeague {
  type: 'league';
  id: string;
  attributes: {
    name: string;
    sport: string;
  };
}

interface PrizePicksResponse {
  data: PrizePicksProjection[];
  included: (PrizePicksPlayer | PrizePicksLeague | any)[];
  meta?: {
    total_count: number;
  };
}

export interface ParsedPrizePick {
  player: string;
  team?: string;
  stat: string;
  line: number;
  startTime: string;
  league: string;
  sport: string;
}

const PRIZEPICKS_RATE_LIMIT: RateLimitConfig = {
  provider: 'prizepicks',
  requestsPerMinute: 30,
  requestsPerHour: 1000,
  requestsPerDay: 10000,
};

export class PrizePicksClient extends IntegrationClient {
  constructor() {
    super('https://api.prizepicks.com', PRIZEPICKS_RATE_LIMIT);
  }

  /**
   * Get all projections for a specific league
   * @param leagueId - League ID (7 for NHL, 2 for NFL, etc.)
   * @param perPage - Results per page (max 250)
   */
  async getProjections(leagueId: string, perPage: number = 250): Promise<ParsedPrizePick[]> {
    try {
      const params = new URLSearchParams({
        league_id: leagueId,
        per_page: perPage.toString(),
        single_stat: 'true',
      });

      const response = await this.get<PrizePicksResponse>(
        `/projections?${params.toString()}`,
        {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            'Accept': 'application/json',
            'Referer': 'https://app.prizepicks.com/',
          }
        }
      );

      return this.parseProjections(response.data);
    } catch (error: any) {
      console.error(`❌ PrizePicks API error for league ${leagueId}:`, error.message);
      throw error;
    }
  }

  /**
   * Get NHL projections (including faceoffs)
   * League ID 8 = NHL (confirmed via testing)
   */
  async getNHLProjections(): Promise<ParsedPrizePick[]> {
    try {
      console.log(`🏒 Fetching NHL projections (league ID 8)...`);
      const projections = await this.getProjections('8');
      console.log(`✅ Found ${projections.length} NHL projections from PrizePicks`);
      return projections;
    } catch (error: any) {
      console.error(`❌ Failed to fetch NHL projections:`, error.message);
      if (error.message.includes('429')) {
        console.log('⚠️  PrizePicks rate limit hit - data will be stale until next refresh window');
      }
      return [];
    }
  }

  /**
   * Get NBA projections
   */
  async getNBAProjections(): Promise<ParsedPrizePick[]> {
    return this.getProjections('7'); // NBA is typically league ID 7
  }

  /**
   * Get NFL projections
   */
  async getNFLProjections(): Promise<ParsedPrizePick[]> {
    return this.getProjections('2'); // NFL is typically league ID 2
  }

  /**
   * Parse the PrizePicks API response into a normalized format
   */
  private parseProjections(response: PrizePicksResponse): ParsedPrizePick[] {
    const { data, included } = response;

    // Build lookup maps for players and leagues
    const playersById = new Map<string, PrizePicksPlayer>();
    const leaguesById = new Map<string, PrizePicksLeague>();

    for (const item of included || []) {
      if (item.type === 'new_player') {
        playersById.set(item.id, item as PrizePicksPlayer);
      } else if (item.type === 'league') {
        leaguesById.set(item.id, item as PrizePicksLeague);
      }
    }

    // Parse projections
    const parsed: ParsedPrizePick[] = [];

    for (const projection of data) {
      const playerId = projection.relationships?.new_player?.data?.id;
      const leagueId = projection.relationships?.league?.data?.id;

      const player = playerId ? playersById.get(playerId) : undefined;
      const league = leagueId ? leaguesById.get(leagueId) : undefined;

      if (!player) {
        console.warn(`⚠️  Skipping projection ${projection.id} - no player data`);
        continue;
      }

      parsed.push({
        player: player.attributes.name,
        team: player.attributes.team || player.attributes.team_name,
        stat: projection.attributes.stat_type,
        line: projection.attributes.line_score,
        startTime: projection.attributes.start_time,
        league: league?.attributes.name || 'Unknown',
        sport: league?.attributes.sport || 'Unknown',
      });
    }

    return parsed;
  }

  /**
   * Get only faceoff projections
   */
  async getFaceoffProjections(): Promise<ParsedPrizePick[]> {
    const nhlProps = await this.getNHLProjections();
    
    const faceoffs = nhlProps.filter(prop => 
      prop.stat.toLowerCase().includes('faceoff')
    );
    
    console.log(`🏒 Found ${faceoffs.length} faceoff projections`);
    return faceoffs;
  }
}

export const prizePicksClient = new PrizePicksClient();
