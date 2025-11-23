import { IntegrationClient, RateLimitConfig } from "./integrationClient";

interface OpticOddsCompetitor {
  id: string;
  name: string;
  abbreviation?: string;
  logo?: string;
}

interface OpticOddsFixture {
  id: string;
  game_id: string;
  start_date: string;
  home_competitors: OpticOddsCompetitor[];
  away_competitors: OpticOddsCompetitor[];
  home_team_display: string;
  away_team_display: string;
  status: string;
  is_live: boolean;
  sport: {
    id: string;
    name: string;
  };
  league: {
    id: string;
    name: string;
  };
}

interface OpticOddsSelection {
  id: string;
  market: string;
  name: string;
  selection: string;
  market_id: string;
  price: number;
  timestamp: number;
  points: number | null;
  selection_line: string | null;
  player_id: string | null;
  team_id: string | null;
  is_main: boolean;
}

interface OpticOddsFixtureWithOdds extends OpticOddsFixture {
  odds: OpticOddsSelection[];
}

interface OpticOddsResponse<T> {
  data: T;
}

// OpticOdds has different rate limits than The Odds API
// Per their docs: 2,500 requests per 15-second window for most endpoints
const OPTICODDS_RATE_LIMIT: RateLimitConfig = {
  provider: "opticodds",
  requestsPerMinute: 1000, // Conservative estimate based on 2500/15s
  requestsPerHour: 10000,
  requestsPerDay: 50000,
};

// Sport mappings for OpticOdds (they use different sport IDs)
const SPORT_MAPPINGS: Record<string, string> = {
  'basketball_nba': 'basketball',
  'icehockey_nhl': 'hockey',
  'americanfootball_nfl': 'football',
  'baseball_mlb': 'baseball',
};

const LEAGUE_MAPPINGS: Record<string, string> = {
  'basketball_nba': 'nba',
  'icehockey_nhl': 'nhl',
  'americanfootball_nfl': 'nfl',
  'baseball_mlb': 'mlb',
};

// Market mappings for player props
const PLAYER_PROP_MARKETS = [
  // NBA
  'player_points',
  'player_rebounds',
  'player_assists',
  'player_threes',
  'player_three_pointers_made',
  'player_three_pointers_attempted',
  'player_blocks',
  'player_steals',
  'player_double_double',
  'player_triple_double',
  'player_pts_rebs_asts',
  'player_pts_rebs',
  'player_pts_asts',
  'player_rebs_asts',
  'player_blocks_steals',
  'player_turnovers',
  'player_fouls',
  'player_first_basket',
  'player_fantasy_score',
  'player_fg_attempted',
  'player_fg_made',
  'player_two_pointers_made',
  'player_two_pointers_attempted',
  'player_free_throws_made',
  'player_free_throws_attempted',
  'player_offensive_rebounds',
  'player_defensive_rebounds',
  'player_dunks',
  'player_blocked_shots',
  'player_personal_fouls',
  // NBA Period-specific (1Q, 1H)
  'player_points_1q',
  'player_rebounds_1q',
  'player_assists_1q',
  'player_points_1h',
  'player_rebounds_1h',
  'player_assists_1h',
  // NHL
  'player_goals',
  'player_assists',
  'player_points',
  'player_shots_on_goal',
  'player_blocked_shots',
  'player_power_play_points',
  'player_faceoffs_won',
  'player_faceoffs',
  'player_saves',
  'player_goals_allowed',
  'player_hits',
  'player_time_on_ice',
  'goalie_saves',
  'goalie_goals_allowed',
  // NFL
  'player_passing_yards',
  'player_passing_tds',
  'player_rushing_yards',
  'player_receiving_yards',
  'player_receptions',
  'player_anytime_td',
  'player_pass_attempts',
  'player_completions',
  'player_interceptions',
  'player_rush_attempts',
  'player_receiving_tds',
  'player_rushing_tds',
  'player_rush_rec_yards',
  'player_rush_rec_tds',
  'player_pass_rush_yards',
  'player_fantasy_score',
  'player_sacks',
  'player_fg_made',
  'player_kicking_points',
  'player_pat_made',
  'player_longest_completion',
  'player_longest_rush',
  'player_tackles_assists',
  'player_punts',
  'player_completion_percentage',
  // NFL Period-specific (1Q, 1H)
  'player_passing_yards_1q',
  'player_rushing_yards_1q',
  'player_receiving_yards_1q',
  'player_passing_yards_1h',
  'player_rushing_yards_1h',
  'player_receiving_yards_1h',
  // MLB
  'player_hits',
  'player_total_bases',
  'player_rbis',
  'player_runs_scored',
  'player_home_runs',
  'player_stolen_bases',
  'pitcher_strikeouts',
  'pitcher_hits_allowed',
  'pitcher_walks',
  'pitcher_earned_runs',
];

class OpticOddsClient extends IntegrationClient {
  private apiKey: string;

  constructor() {
    super("https://api.opticodds.com/api/v3", OPTICODDS_RATE_LIMIT);
    this.apiKey = process.env.OPTICODDS_API_KEY || "";
    
    if (!this.apiKey) {
      console.warn("⚠️  OPTICODDS_API_KEY not set - PrizePicks/Underdog data will be unavailable");
    } else {
      console.log("🎯 OpticOdds API configured for PrizePicks and Underdog Fantasy");
    }
  }

  private getOpticOddsSport(sport: string): string {
    return SPORT_MAPPINGS[sport] || 'basketball';
  }

  private getOpticOddsLeague(sport: string): string {
    return LEAGUE_MAPPINGS[sport] || 'nba';
  }

  /**
   * Get active fixtures for a sport
   */
  async getActiveFixtures(sport: string = "basketball_nba"): Promise<OpticOddsFixture[]> {
    if (!this.apiKey) {
      console.warn("No OPTICODDS_API_KEY configured");
      return [];
    }

    const opticSport = this.getOpticOddsSport(sport);
    const opticLeague = this.getOpticOddsLeague(sport);

    const params = new URLSearchParams({
      key: this.apiKey,
      sport: opticSport,
      league: opticLeague,
    });

    try {
      const response = await this.get<OpticOddsResponse<OpticOddsFixture[]>>(
        `/fixtures/active?${params.toString()}`
      );

      return response?.data?.data || [];
    } catch (error) {
      console.error(`❌ Error fetching active fixtures for ${sport}:`, error);
      return [];
    }
  }

  /**
   * Get player props for specific fixtures from a specific sportsbook
   */
  private async getPlayerPropsForSportsbook(
    fixtureIds: string[],
    sportsbook: 'PrizePicks' | 'Underdog'
  ): Promise<Array<OpticOddsFixtureWithOdds & { sportsbook: string }>> {
    const allFixturesWithOdds: Array<OpticOddsFixtureWithOdds & { sportsbook: string }> = [];
    let successfulBatches = 0;
    let failedBatches = 0;

    // OpticOdds allows up to 5 fixture_ids per request
    const batchSize = 5;
    for (let i = 0; i < fixtureIds.length; i += batchSize) {
      const batch = fixtureIds.slice(i, i + batchSize);
      
      try {
        const params = new URLSearchParams({
          key: this.apiKey,
          is_main: 'true', // Only get main lines
          sportsbook, // Fetch one sportsbook at a time for proper attribution
        });

        // Add fixture IDs
        batch.forEach(id => params.append('fixture_id', id));

        const response = await this.get<OpticOddsResponse<OpticOddsFixtureWithOdds[]>>(
          `/copilot/fixtures/odds?${params.toString()}`
        );

        if (response?.data?.data) {
          // Tag each fixture with the sportsbook it came from
          const taggedFixtures = response.data.data.map(fixture => ({
            ...fixture,
            sportsbook,
          }));
          allFixturesWithOdds.push(...taggedFixtures);
          successfulBatches++;
        }
      } catch (error) {
        failedBatches++;
        console.error(`❌ Error fetching ${sportsbook} props for fixtures ${batch.join(', ')}:`, error);
        // Continue with other batches even if one fails
      }
    }

    if (successfulBatches > 0) {
      console.log(`✅ ${sportsbook}: Successfully fetched ${successfulBatches}/${successfulBatches + failedBatches} batches`);
    }
    if (failedBatches > 0) {
      console.log(`⚠️  ${sportsbook}: ${failedBatches} batches failed`);
    }

    return allFixturesWithOdds;
  }

  /**
   * Get player props for specific fixtures from PrizePicks and Underdog Fantasy
   */
  async getPlayerProps(
    sport: string = "basketball_nba",
    fixtureIds?: string[]
  ): Promise<Array<OpticOddsFixtureWithOdds & { sportsbook: string }>> {
    if (!this.apiKey) {
      console.warn("No OPTICODDS_API_KEY configured");
      return [];
    }

    // If no fixture IDs provided, get active fixtures first
    if (!fixtureIds || fixtureIds.length === 0) {
      const fixtures = await this.getActiveFixtures(sport);
      
      if (fixtures.length === 0) {
        console.log(`No active fixtures found for ${sport}`);
        return [];
      }

      fixtureIds = fixtures.map(f => f.id).slice(0, 50); // Limit to 50 fixtures
      console.log(`📊 Found ${fixtures.length} active ${sport} fixtures, fetching props for ${fixtureIds.length}`);
    }

    // Fetch from both sportsbooks separately to properly attribute each prop
    const [prizePicksFixtures, underdogFixtures] = await Promise.all([
      this.getPlayerPropsForSportsbook(fixtureIds, 'PrizePicks'),
      this.getPlayerPropsForSportsbook(fixtureIds, 'Underdog'),
    ]);

    const allFixtures = [...prizePicksFixtures, ...underdogFixtures];
    console.log(`✅ Total: Fetched ${allFixtures.length} fixtures (${prizePicksFixtures.length} PrizePicks, ${underdogFixtures.length} Underdog)`);
    
    return allFixtures;
  }

  /**
   * Normalize OpticOdds data to our internal prop format
   */
  normalizeToProps(fixtures: Array<OpticOddsFixtureWithOdds & { sportsbook: string }>): Array<{
    player: string;
    team: string;
    opponent: string;
    stat: string;
    line: string;
    direction: "over" | "under";
    platform: string;
    gameTime: Date;
    odds: number;
    fixtureId: string;
    marketId: string;
  }> {
    const props: Array<any> = [];

    for (const fixture of fixtures) {
      const gameTime = new Date(fixture.start_date);
      const homeTeam = fixture.home_team_display;
      const awayTeam = fixture.away_team_display;

      for (const odd of fixture.odds) {
        // Only process player prop markets
        if (!PLAYER_PROP_MARKETS.includes(odd.market_id)) continue;
        if (!odd.player_id) continue; // Skip if not a player prop
        if (!odd.points) continue; // Skip if no line

        // Determine if this is an over or under
        // OpticOdds uses "over/under" in the selection name
        const isOver = odd.selection.toLowerCase().includes('over');
        const isUnder = odd.selection.toLowerCase().includes('under');
        
        if (!isOver && !isUnder) {
          // Some markets don't explicitly say over/under
          // We'll create both over and under from the same line
          const playerName = odd.selection.replace(/\s+(Over|Under)\s+[\d.]+/i, '').trim();
          const statName = this.formatStatName(odd.market);
          
          // Determine team based on team_id
          let team = homeTeam;
          if (odd.team_id) {
            const homeComp = fixture.home_competitors[0];
            const awayComp = fixture.away_competitors[0];
            if (homeComp && odd.team_id === homeComp.id) {
              team = homeTeam;
            } else if (awayComp && odd.team_id === awayComp.id) {
              team = awayTeam;
            }
          }

          const opponent = team === homeTeam ? awayTeam : homeTeam;

          // Create over prop
          props.push({
            player: playerName,
            team,
            opponent,
            stat: statName,
            line: odd.points.toString(),
            direction: "over" as const,
            platform: fixture.sportsbook, // Use actual sportsbook from API response
            gameTime,
            odds: odd.price,
            fixtureId: fixture.id,
            marketId: odd.market_id,
          });

          // Create under prop
          props.push({
            player: playerName,
            team,
            opponent,
            stat: statName,
            line: odd.points.toString(),
            direction: "under" as const,
            platform: fixture.sportsbook, // Use actual sportsbook from API response
            gameTime,
            odds: odd.price,
            fixtureId: fixture.id,
            marketId: odd.market_id,
          });
        } else {
          // Explicit over/under in selection
          const playerName = odd.selection.replace(/\s+(Over|Under)\s+[\d.]+/i, '').trim();
          const statName = this.formatStatName(odd.market);
          
          let team = homeTeam;
          if (odd.team_id) {
            const homeComp = fixture.home_competitors[0];
            const awayComp = fixture.away_competitors[0];
            if (homeComp && odd.team_id === homeComp.id) {
              team = homeTeam;
            } else if (awayComp && odd.team_id === awayComp.id) {
              team = awayTeam;
            }
          }

          const opponent = team === homeTeam ? awayTeam : homeTeam;
          const direction: "over" | "under" = isOver ? "over" : "under";

          props.push({
            player: playerName,
            team,
            opponent,
            stat: statName,
            line: odd.points.toString(),
            direction,
            platform: fixture.sportsbook, // Use actual sportsbook from API response
            gameTime,
            odds: odd.price,
            fixtureId: fixture.id,
            marketId: odd.market_id,
          });
        }
      }
    }

    return props;
  }

  /**
   * Format market name to stat name
   */
  private formatStatName(market: string): string {
    // Remove "player_" / "pitcher_" / "goalie_" prefix and format
    const stat = market.replace('player_', '').replace('pitcher_', '').replace('goalie_', '');
    
    // Handle special cases
    const specialCases: Record<string, string> = {
      // NBA
      'pts_rebs_asts': 'Pts+Rebs+Asts',
      'points_rebounds_assists': 'Pts+Rebs+Asts',
      'pts_rebs': 'Pts+Rebs',
      'points_rebounds': 'Pts+Rebs',
      'pts_asts': 'Pts+Asts',
      'points_assists': 'Pts+Asts',
      'rebs_asts': 'Rebs+Asts',
      'rebounds_assists': 'Rebs+Asts',
      'blocks_steals': 'Blks+Stls',
      'threes': '3-PT Made',
      'three_pointers_made': '3-PT Made',
      'three_pointers_attempted': '3-PT Attempted',
      'fg_attempted': 'FG Attempted',
      'fg_made': 'FG Made',
      'two_pointers_made': 'Two Pointers Made',
      'two_pointers_attempted': 'Two Pointers Attempted',
      'free_throws_made': 'Free Throws Made',
      'free_throws_attempted': 'Free Throws Attempted',
      'offensive_rebounds': 'Offensive Rebounds',
      'defensive_rebounds': 'Defensive Rebounds',
      'dunks': 'Dunks',
      'blocked_shots': 'Blocked Shots',
      'personal_fouls': 'Personal Fouls',
      'fouls': 'Personal Fouls',
      'double_double': 'Double Double',
      'triple_double': 'Triple Double',
      'first_basket': 'First Basket',
      // NBA Period-specific
      'points_1q': 'Points 1Q',
      'rebounds_1q': 'Rebounds 1Q',
      'assists_1q': 'Assists 1Q',
      'points_1h': 'Points 1H',
      'rebounds_1h': 'Rebounds 1H',
      'assists_1h': 'Assists 1H',
      // NHL
      'shots_on_goal': 'Shots on Goal',
      'power_play_points': 'Power Play Points',
      'faceoffs_won': 'Faceoffs Won',
      'faceoffs': 'Faceoffs Won',
      'time_on_ice': 'Time on Ice',
      'goals_allowed': 'Goals Allowed',
      'saves': 'Goalie Saves',
      // NFL
      'passing_yards': 'Passing Yards',
      'passing_tds': 'Passing TDs',
      'pass_attempts': 'Pass Attempts',
      'passes_attempted': 'Pass Attempts',
      'completions': 'Completions',
      'pass_completions': 'Completions',
      'rushing_yards': 'Rushing Yards',
      'rush_attempts': 'Rush Attempts',
      'rushing_attempts': 'Rush Attempts',
      'rushing_tds': 'Rushing TDs',
      'receiving_yards': 'Receiving Yards',
      'receiving_tds': 'Receiving TDs',
      'anytime_td': 'Anytime TD',
      'rush_rec_yards': 'Rush+Rec Yards',
      'rush_rec_tds': 'Rush+Rec TDs',
      'pass_rush_yards': 'Pass+Rush Yards',
      'sacks': 'Sacks',
      'kicking_points': 'Kicking Points',
      'pat_made': 'PAT Made',
      'longest_completion': 'Longest Completion',
      'longest_rush': 'Longest Rush',
      'tackles_assists': 'Tackles+Assists',
      'punts': 'Punts',
      'completion_percentage': 'Completion %',
      'interceptions': 'Interceptions',
      // NFL Period-specific
      'passing_yards_1q': 'Passing Yards 1Q',
      'rushing_yards_1q': 'Rushing Yards 1Q',
      'receiving_yards_1q': 'Receiving Yards 1Q',
      'passing_yards_1h': 'Passing Yards 1H',
      'rushing_yards_1h': 'Rushing Yards 1H',
      'receiving_yards_1h': 'Receiving Yards 1H',
      // MLB
      'total_bases': 'Total Bases',
      'runs_scored': 'Runs',
      'home_runs': 'Home Runs',
      'stolen_bases': 'Stolen Bases',
      'hits_allowed': 'Hits Allowed',
      'earned_runs': 'Earned Runs',
    };

    if (specialCases[stat]) {
      return specialCases[stat];
    }

    // Default: capitalize first letter of each word
    return stat
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }
}

export const opticOddsClient = new OpticOddsClient();
