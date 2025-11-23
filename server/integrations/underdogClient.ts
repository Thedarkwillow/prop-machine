import { IntegrationClient, RateLimitConfig } from "./integrationClient";

interface UnderdogAppearance {
  id: string;
  player_id: string;
  match_id: string;
  stat_type_id: number;
  over_under: {
    appearance_stat: {
      display_stat: string;
      stat_value: number;
    };
  };
  market: string;
  scheduled_at: string;
  status: string;
}

interface UnderdogPlayer {
  id: string;
  first_name: string;
  last_name: string;
  team_id: string;
  sport_id: number;
  position_id: number;
}

interface UnderdogMatch {
  id: string;
  sport_id: number;
  home_team_id: string;
  away_team_id: string;
  scheduled_at: string;
  status: string;
}

interface UnderdogResponse {
  appearances: UnderdogAppearance[];
  players?: UnderdogPlayer[];
  matches?: UnderdogMatch[];
  teams?: Array<{
    id: string;
    name: string;
    abbreviation: string;
  }>;
}

const UNDERDOG_RATE_LIMIT: RateLimitConfig = {
  provider: "underdog",
  requestsPerMinute: 30,
  requestsPerHour: 500,
  requestsPerDay: 5000,
};

// Sport IDs from Underdog
const SPORT_IDS: { [key: string]: number } = {
  NBA: 2,
  NFL: 4,
  NHL: 8,
  MLB: 4,
};

// Stat type normalization
const STAT_NAME_MAP: { [key: string]: string } = {
  'passing_yards': 'Pass Yards',
  'rushing_yards': 'Rush Yards',
  'receiving_yards': 'Rec Yards',
  'receptions': 'Receptions',
  'passing_tds': 'Pass TDs',
  'rushing_tds': 'Rush TDs',
  'receiving_tds': 'Rec TDs',
  'points': 'Points',
  'rebounds': 'Rebounds',
  'assists': 'Assists',
  'threes': '3PM',
  '3-pointers_made': '3PM',
  'steals': 'Steals',
  'blocks': 'Blocks',
  'goals': 'Goals',
  'shots_on_goal': 'SOG',
  'saves': 'Saves',
  'fantasy_points': 'Fantasy Points',
  'pts+rebs+asts': 'PTS+REB+AST',
  'pts+rebs': 'PTS+REB',
  'pts+asts': 'PTS+AST',
};

class UnderdogClient extends IntegrationClient {
  constructor() {
    super("https://api.underdogfantasy.com/v1", UNDERDOG_RATE_LIMIT);
  }

  async getAppearances(sport: string = "NBA"): Promise<UnderdogResponse> {
    const sportId = SPORT_IDS[sport] || SPORT_IDS['NBA'];
    
    const params = new URLSearchParams({
      sport_id: sportId.toString(),
      status: 'upcoming',
      projection_types: 'all',
      market_type: 'daily',
    });

    try {
      const response = await this.get<UnderdogResponse>(
        `/appearances?${params.toString()}`
      );

      return response?.data || { appearances: [] };
    } catch (error) {
      console.error('Underdog API error:', error);
      return { appearances: [] };
    }
  }

  normalizeStatType(statType: string): string {
    const normalized = statType.toLowerCase().replace(/\s+/g, '_');
    return STAT_NAME_MAP[normalized] || statType;
  }

  normalizeToProps(response: UnderdogResponse, sport: string): Array<{
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

    // Build lookup maps
    const players = new Map<string, UnderdogPlayer>();
    const matches = new Map<string, UnderdogMatch>();
    const teams = new Map<string, any>();

    if (response.players) {
      for (const player of response.players) {
        players.set(player.id, player);
      }
    }

    if (response.matches) {
      for (const match of response.matches) {
        matches.set(match.id, match);
      }
    }

    if (response.teams) {
      for (const team of response.teams) {
        teams.set(team.id, team);
      }
    }

    // Process each appearance
    for (const appearance of response.appearances) {
      if (appearance.status !== 'active') continue;

      const player = players.get(appearance.player_id);
      const match = matches.get(appearance.match_id);
      
      if (!player || !match) continue;

      const team = teams.get(player.team_id);
      const homeTeam = teams.get(match.home_team_id);
      const awayTeam = teams.get(match.away_team_id);
      
      // Determine opponent
      let opponent = '';
      if (team && homeTeam && awayTeam) {
        opponent = team.id === homeTeam.id ? awayTeam.abbreviation : homeTeam.abbreviation;
      }

      const statValue = appearance.over_under?.appearance_stat?.stat_value;
      const displayStat = appearance.over_under?.appearance_stat?.display_stat;
      
      if (!statValue || !displayStat) continue;

      const normalizedStat = this.normalizeStatType(displayStat);
      const playerName = `${player.first_name} ${player.last_name}`;

      // Create both over and under props
      props.push({
        player: playerName,
        team: team?.abbreviation || '',
        opponent,
        stat: normalizedStat,
        line: statValue.toString(),
        direction: 'over' as const,
        period: 'full_game', // Underdog typically doesn't specify quarters
        gameTime: new Date(appearance.scheduled_at),
        platform: 'Underdog',
      });

      props.push({
        player: playerName,
        team: team?.abbreviation || '',
        opponent,
        stat: normalizedStat,
        line: statValue.toString(),
        direction: 'under' as const,
        period: 'full_game',
        gameTime: new Date(appearance.scheduled_at),
        platform: 'Underdog',
      });
    }

    return props;
  }
}

export const underdogClient = new UnderdogClient();
