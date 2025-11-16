import { IntegrationClient, RateLimitConfig } from "./integrationClient";

interface OddsApiGame {
  id: string;
  sport_key: string;
  sport_title: string;
  commence_time: string;
  home_team: string;
  away_team: string;
  bookmakers: Array<{
    key: string;
    title: string;
    last_update: string;
    markets: Array<{
      key: string;
      last_update: string;
      outcomes: Array<{
        name: string;
        description?: string;
        price: number;
        point?: number;
      }>;
    }>;
  }>;
}

interface OddsApiResponse {
  data: OddsApiGame[];
}

const ODDS_API_RATE_LIMIT: RateLimitConfig = {
  provider: "odds_api",
  requestsPerMinute: 20,
  requestsPerHour: 500,
  requestsPerDay: 500,
};

class OddsApiClient extends IntegrationClient {
  private apiKey: string;

  constructor() {
    super("https://api.the-odds-api.com/v4", ODDS_API_RATE_LIMIT);
    this.apiKey = process.env.ODDS_API_KEY || "";
    
    if (!this.apiKey) {
      console.warn("ODDS_API_KEY not set - odds data will be unavailable");
    }
  }

  async getUpcomingGames(sport: string = "basketball_nba"): Promise<OddsApiResponse> {
    if (!this.apiKey) {
      console.warn("No ODDS_API_KEY configured");
      return { data: [] };
    }

    const params = new URLSearchParams({
      apiKey: this.apiKey,
      regions: "us",
      markets: "h2h,spreads,totals,player_points,player_rebounds,player_assists",
      oddsFormat: "american",
    });

    const response = await this.get<OddsApiGame[]>(
      `/sports/${sport}/odds?${params.toString()}`
    );

    return { data: response?.data || [] };
  }

  async getPlayerProps(sport: string = "basketball_nba", eventId?: string): Promise<OddsApiResponse> {
    if (!this.apiKey) {
      console.warn("No ODDS_API_KEY configured");
      return { data: [] };
    }

    const params = new URLSearchParams({
      apiKey: this.apiKey,
      regions: "us",
      markets: "player_points,player_rebounds,player_assists,player_threes,player_blocks,player_steals",
      oddsFormat: "american",
    });

    let endpoint = `/sports/${sport}/odds`;
    if (eventId) {
      endpoint = `/sports/${sport}/events/${eventId}/odds`;
    }

    const response = await this.get<OddsApiGame[]>(
      `${endpoint}?${params.toString()}`
    );

    return { data: response?.data || [] };
  }

  async getSportsList(): Promise<Array<{ key: string; title: string; group: string }>> {
    if (!this.apiKey) {
      return [];
    }

    const params = new URLSearchParams({
      apiKey: this.apiKey,
    });

    const response = await this.get<Array<{ key: string; title: string; group: string }>>(
      `/sports?${params.toString()}`
    );

    return response?.data || [];
  }

  normalizeToProps(games: OddsApiGame[], sport: string): Array<{
    player: string;
    team: string;
    opponent: string;
    stat: string;
    line: string;
    direction: "over" | "under";
    platform: string;
    gameTime: Date;
    odds: number;
  }> {
    const props: Array<any> = [];

    for (const game of games) {
      const gameTime = new Date(game.commence_time);

      for (const bookmaker of game.bookmakers) {
        for (const market of bookmaker.markets) {
          // Only process player prop markets
          if (!market.key.startsWith("player_")) continue;

          const stat = market.key.replace("player_", "");
          const statName = stat.charAt(0).toUpperCase() + stat.slice(1);

          for (const outcome of market.outcomes) {
            if (!outcome.point) continue; // Skip if no line

            // Create both over and under props
            props.push({
              player: outcome.name,
              team: outcome.description || game.home_team,
              opponent: game.away_team,
              stat: statName,
              line: outcome.point.toString(),
              direction: "over" as const,
              platform: bookmaker.title,
              gameTime,
              odds: outcome.price,
            });

            props.push({
              player: outcome.name,
              team: outcome.description || game.home_team,
              opponent: game.away_team,
              stat: statName,
              line: outcome.point.toString(),
              direction: "under" as const,
              platform: bookmaker.title,
              gameTime,
              odds: outcome.price,
            });
          }
        }
      }
    }

    return props;
  }
}

export const oddsApiClient = new OddsApiClient();
