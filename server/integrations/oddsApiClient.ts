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

// Sport-specific market mappings for The Odds API
const SPORT_MARKETS: Record<string, string> = {
  'basketball_nba': 'player_points,player_rebounds,player_assists,player_threes,player_blocks,player_steals',
  'icehockey_nhl': 'player_points,player_assists,player_shots_on_goal,player_blocked_shots,player_power_play_points',
  'americanfootball_nfl': 'player_pass_yds,player_pass_tds,player_pass_completions,player_pass_attempts,player_pass_interceptions,player_rush_yds,player_rush_attempts,player_receptions,player_reception_yds,player_kicking_points,player_field_goals,player_anytime_td',
  'baseball_mlb': 'player_hits,player_total_bases,player_rbis,player_runs_scored,player_home_runs,player_stolen_bases,pitcher_strikeouts,pitcher_hits_allowed,pitcher_walks,pitcher_earned_runs',
};

class OddsApiClient extends IntegrationClient {
  private apiKey: string;
  private maxEventsPerSport: number;

  constructor() {
    super("https://api.the-odds-api.com/v4", ODDS_API_RATE_LIMIT);
    this.apiKey = process.env.ODDS_API_KEY || "";
    this.maxEventsPerSport = parseInt(process.env.ODDS_API_MAX_EVENTS_PER_SPORT || "50", 10);
    
    if (!this.apiKey) {
      console.warn("ODDS_API_KEY not set - odds data will be unavailable");
    }
    
    console.log(`🎯 Odds API configured with max ${this.maxEventsPerSport} events per sport`);
  }
  
  /**
   * Get sport-specific markets for The Odds API
   */
  private getSportMarkets(sport: string): string {
    return SPORT_MARKETS[sport] || SPORT_MARKETS['basketball_nba'];
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

  async getUpcomingEvents(sport: string = "basketball_nba"): Promise<Array<{ id: string; home_team: string; away_team: string; commence_time: string }>> {
    if (!this.apiKey) {
      console.warn("No ODDS_API_KEY configured");
      return [];
    }

    const params = new URLSearchParams({
      apiKey: this.apiKey,
    });

    const response = await this.get<Array<{ id: string; home_team: string; away_team: string; commence_time: string }>>(
      `/sports/${sport}/events?${params.toString()}`
    );

    return response?.data || [];
  }

  async getPlayerProps(sport: string = "basketball_nba", eventId?: string): Promise<OddsApiResponse> {
    if (!this.apiKey) {
      console.warn("No ODDS_API_KEY configured");
      return { data: [] };
    }

    const markets = this.getSportMarkets(sport);

    // If no eventId provided, get all upcoming events and fetch props for each
    if (!eventId) {
      const events = await this.getUpcomingEvents(sport);
      
      if (events.length === 0) {
        console.log(`No upcoming events found for ${sport}`);
        return { data: [] };
      }

      const totalEvents = events.length;
      const eventsToFetch = events.slice(0, this.maxEventsPerSport);
      
      console.log(`📊 Found ${totalEvents} upcoming ${sport} events`);
      console.log(`🎯 Fetching player props from ${eventsToFetch.length} events (limit: ${this.maxEventsPerSport})`);
      if (totalEvents > this.maxEventsPerSport) {
        console.log(`⚠️  Skipping ${totalEvents - this.maxEventsPerSport} events to protect API quota`);
      }
      
      const allGames: OddsApiGame[] = [];
      let successCount = 0;
      let errorCount = 0;
      
      for (const event of eventsToFetch) {
        try {
          const params = new URLSearchParams({
            apiKey: this.apiKey,
            regions: "us",
            markets,
            oddsFormat: "american",
          });

          const response = await this.get<OddsApiGame>(
            `/sports/${sport}/events/${event.id}/odds?${params.toString()}`
          );

          if (response?.data) {
            allGames.push(response.data);
            successCount++;
          }
        } catch (error) {
          errorCount++;
          console.error(`❌ Error fetching props for event ${event.id}:`, error);
          // Continue with other events even if one fails
        }
      }

      console.log(`✅ Successfully fetched props from ${successCount}/${eventsToFetch.length} events`);
      if (errorCount > 0) {
        console.log(`⚠️  ${errorCount} events failed to fetch`);
      }

      return { data: allGames };
    }

    // Single event request
    const params = new URLSearchParams({
      apiKey: this.apiKey,
      regions: "us",
      markets,
      oddsFormat: "american",
    });

    const response = await this.get<OddsApiGame>(
      `/sports/${sport}/events/${eventId}/odds?${params.toString()}`
    );

    return { data: response?.data ? [response.data] : [] };
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
            // Note: Using "The Odds API" as platform since we aggregate from multiple bookmakers
            props.push({
              player: outcome.name,
              team: outcome.description || game.home_team,
              opponent: game.away_team,
              stat: statName,
              line: outcome.point.toString(),
              direction: "over" as const,
              platform: "The Odds API",
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
              platform: "The Odds API",
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
