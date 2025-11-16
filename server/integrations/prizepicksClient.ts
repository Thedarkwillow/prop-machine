import { IntegrationClient, RateLimitConfig } from "./integrationClient";

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
    super("https://api.prizepicks.com", PRIZEPICKS_RATE_LIMIT);
  }

  async getProjections(sport: string = "NBA"): Promise<PrizePicksResponse> {
    const leagueId = LEAGUE_IDS[sport] || LEAGUE_IDS['NBA'];
    
    const params = new URLSearchParams({
      league_id: leagueId.toString(),
      per_page: '250',
      single_stat: 'true',
    });

    const response = await this.get<PrizePicksResponse>(
      `/projections?${params.toString()}`
    );

    return response?.data || { data: [], included: [] };
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
