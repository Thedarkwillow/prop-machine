import { IntegrationClient, RateLimitConfig } from "./integrationClient";
import { getStealthScraper } from "./prizepicksStealth";

interface PrizePick {
  id: string;
  type: string;
  attributes: {
    line_score: number;
    stat_type: string;
    start_time: string;
    end_time: string;
    is_promo: boolean;
    league_id: number;
    flash_sale_line_score?: number;
  };
  relationships: {
    new_player: {
      data: {
        id: string;
        type: string;
      };
    };
    league: {
      data: {
        id: string;
        type: string;
      };
    };
  };
}

interface PrizePicksPlayer {
  id: string;
  type: string;
  attributes: {
    name: string;
    team: string;
    team_name: string;
    position: string;
    image_url: string;
  };
}

interface PrizePicksLeague {
  id: string;
  type: string;
  attributes: {
    name: string;
    sport: string;
  };
}

interface PrizePicksResponse {
  data: PrizePick[];
  included: Array<PrizePicksPlayer | PrizePicksLeague>;
}

const PRIZEPICKS_RATE_LIMIT: RateLimitConfig = {
  provider: "prizepicks",
  requestsPerMinute: 30,
  requestsPerHour: 500,
  requestsPerDay: 5000,
};

// League IDs from PrizePicks
const LEAGUE_IDS: { [key: string]: number } = {
  NBA: 7,
  NFL: 9,
  NHL: 6,
  MLB: 2,
};

// Period type mapping
const PERIOD_TYPE_MAP: { [key: string]: string } = {
  '1q': '1Q',
  '1h': '1H',
  '2h': '2H',
  '4q': '4Q',
  'game': 'full_game',
};

class PrizePicksClient extends IntegrationClient {
  constructor() {
    // Enhanced headers based on mada949's successful approach
    const enhancedHeaders = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept': 'application/json, text/plain, */*',
      'Accept-Language': 'en-US,en;q=0.9',
      'Accept-Encoding': 'gzip, deflate, br',
      'Connection': 'keep-alive',
      'Sec-Fetch-Dest': 'empty',
      'Sec-Fetch-Mode': 'cors',
      'Sec-Fetch-Site': 'same-origin',
    };
    
    super("https://api.prizepicks.com", PRIZEPICKS_RATE_LIMIT, { ttl: 300, useETag: true, useLastModified: true }, enhancedHeaders);
  }

  async getProjections(sport: string = "NBA"): Promise<PrizePicksResponse> {
    // Feature flag: Skip PrizePicks if disabled
    if (process.env.DISABLE_PRIZEPICKS === 'true') {
      console.log(`⏭️ PrizePicks disabled via DISABLE_PRIZEPICKS flag`);
      return { data: [], included: [] };
    }

    const leagueId = LEAGUE_IDS[sport] || LEAGUE_IDS['NBA'];
    
    // APPROACH 1: Try direct API with enhanced headers (mada949's method)
    const params = new URLSearchParams({
      league_id: leagueId.toString(),
      per_page: '250',
      single_stat: 'true',
      game_mode: 'pickem',
    });

    console.log(`🎯 PrizePicks: Attempting direct API for ${sport} (league_id: ${leagueId})`);
    
    try {
      const response = await this.get<PrizePicksResponse>(
        `/projections?${params.toString()}`
      );

      console.log(`✅ PrizePicks: Fetched ${response.data?.data?.length || 0} projections via direct API`);
      return response?.data || { data: [], included: [] };
    } catch (directApiError: any) {
      // Capture PerimeterX telemetry if present
      const errorMsg = directApiError?.message || '';
      const isPerimeterX = errorMsg.includes('PXZNeitfzP');
      
      if (isPerimeterX) {
        console.warn(`🚫 PrizePicks: PerimeterX CAPTCHA detected - bot protection active`);
        // Don't try stealth browser after PerimeterX detection
        return { data: [], included: [] };
      }
      
      // APPROACH 2: Fall back to stealth browser for other errors
      console.warn(`⚠️ PrizePicks direct API failed, trying stealth browser...`);
      
      try {
        const scraper = getStealthScraper();
        const stealthResponse = await scraper.scrapeProjections(sport);
        
        console.log(`✅ PrizePicks: Fetched ${stealthResponse.data?.length || 0} projections via stealth browser`);
        return stealthResponse;
      } catch (stealthError: any) {
        const isConnectionClosed = stealthError?.message?.includes('Connection closed');
        
        if (isConnectionClosed) {
          console.warn(`🚫 PrizePicks: Browser connection blocked - stealth detection active`);
        } else {
          console.error(`❌ PrizePicks stealth browser failed:`, stealthError.message);
        }
        
        // Return empty instead of throwing to avoid scheduler noise
        return { data: [], included: [] };
      }
    }
  }

  normalizeToProp(
    pick: PrizePick,
    players: Map<string, PrizePicksPlayer>,
    sport: string
  ): {
    player: string;
    team: string;
    stat: string;
    line: string;
    period: string;
    gameTime: Date;
    platform: string;
  } | null {
    const playerId = pick.relationships.new_player.data.id;
    const player = players.get(playerId);
    
    if (!player) return null;

    // Detect period from stat_type (e.g., "Points 1Q" or "Points 1H")
    const statType = pick.attributes.stat_type;
    let baseStat = statType;
    let period = 'full_game';
    
    // Check for period suffixes
    const periodMatch = statType.match(/\s+(1Q|1H|2H|4Q)$/i);
    if (periodMatch) {
      period = periodMatch[1].toUpperCase();
      baseStat = statType.replace(/\s+(1Q|1H|2H|4Q)$/i, '').trim();
    }

    return {
      player: player.attributes.name,
      team: player.attributes.team,
      stat: baseStat,
      line: pick.attributes.line_score.toString(),
      period,
      gameTime: new Date(pick.attributes.start_time),
      platform: 'PrizePicks',
    };
  }

  normalizeToProps(response: PrizePicksResponse, sport: string): Array<{
    player: string;
    team: string;
    opponent: string;
    stat: string;
    line: string;
    direction: "over" | "under";
    period: string;
    gameTime: Date;
    platform: string;
  }> {
    const props: Array<any> = [];

    // Build player map
    const players = new Map<string, PrizePicksPlayer>();
    for (const item of response.included) {
      if (item.type === 'new_player') {
        players.set(item.id, item as PrizePicksPlayer);
      }
    }

    // Process each projection
    for (const pick of response.data) {
      // Skip promo picks
      if (pick.attributes.is_promo) continue;

      const normalized = this.normalizeToProp(pick, players, sport);
      if (!normalized) continue;

      // PrizePicks props are "over" by default
      // We'll create both over and under for consistency
      props.push({
        ...normalized,
        opponent: '', // PrizePicks doesn't provide opponent info directly
        direction: 'over' as const,
      });

      props.push({
        ...normalized,
        opponent: '',
        direction: 'under' as const,
      });
    }

    return props;
  }
}

export const prizepicksClient = new PrizePicksClient();
