import { EventSource } from 'eventsource';
import type { IStorage } from '../storage';
import { storage } from '../storage';
import { opticOddsClient } from '../integrations/opticOddsClient';
import { normalizeStat } from '../utils/statNormalizer';
import { propAnalysisService } from './propAnalysisService';

interface StreamOddsEvent {
  id: string;
  fixture_id: string;
  sportsbook: string;
  market: string;
  market_id: string;
  selection: string;
  price: number;
  timestamp: number;
  is_main: boolean;
  is_live: boolean;
  points?: number | null;
  player_id?: string | null;
  team_id?: string | null;
}

interface StreamEvent {
  event: 'odds' | 'locked-odds' | 'heartbeat';
  entry_id: string;
  data: StreamOddsEvent[];
}

interface StreamConfig {
  sport: string;
  sportsbooks: string[];
  fixtureId?: string; // REQUIRED by OpticOdds streaming API
  leagues?: string[];
  markets?: string[];
  isMain?: boolean;
}

interface FixtureCache {
  homeTeam: string;
  awayTeam: string;
  sport: string;
}

export class OpticOddsStreamService {
  private storage: IStorage;
  private apiKey: string;
  private baseUrl = 'https://api.opticodds.com/api/v3';
  private activeStreams: Map<string, EventSource> = new Map();
  private lastEntryIds: Map<string, string> = new Map();
  private reconnectAttempts: Map<string, number> = new Map();
  private fixtureCache: Map<string, FixtureCache> = new Map();
  private failureCount: Map<string, number> = new Map();
  private backoffDelay: Map<string, number> = new Map();
  private maxReconnectAttempts = 5;
  private reconnectDelay = 5000;
  private maxBackoffDelay = 300000; // 5 minutes max backoff
  private initialBackoffDelay = 5000; // 5 seconds initial
  private maxFailuresBeforeDisable = 10; // Disable stream after 10 consecutive failures

  constructor(storageInstance: IStorage = storage) {
    this.storage = storageInstance;
    this.apiKey = process.env.OPTICODDS_API_KEY || '';

    if (!this.apiKey) {
      console.warn('⚠️  No OPTICODDS_API_KEY configured for streaming');
    }
  }

  /**
   * Fetch and cache fixture data for team name lookups
   */
  private async cacheFixtures(sport: string): Promise<void> {
    try {
      console.log(`📦 Fetching fixtures for ${sport} to cache team names...`);
      const fixtures = await opticOddsClient.getActiveFixtures(sport);
      
      for (const fixture of fixtures) {
        this.fixtureCache.set(fixture.id, {
          homeTeam: fixture.home_team_display,
          awayTeam: fixture.away_team_display,
          sport: fixture.sport.name,
        });
      }
      
      console.log(`✅ Cached ${fixtures.length} fixtures for team lookups`);
    } catch (error) {
      console.error('❌ Failed to cache fixtures:', error);
    }
  }

  /**
   * Start streaming real-time odds for a specific sport/sportsbooks
   */
  startOddsStream(config: StreamConfig): string {
    const streamId = this.generateStreamId(config);

    if (this.activeStreams.has(streamId)) {
      console.log(`📡 Stream ${streamId} already active`);
      return streamId;
    }

    console.log(`📡 Starting OpticOdds stream: ${streamId}`);
    
    // Clear any stale failure/backoff state from previous runs
    this.failureCount.delete(streamId);
    this.backoffDelay.delete(streamId);
    this.reconnectAttempts.delete(streamId);
    this.lastEntryIds.delete(streamId);
    
    // Fetch fixtures to populate team names
    this.cacheFixtures(config.sport).catch(err =>
      console.error('Failed to pre-cache fixtures:', err)
    );
    
    this.connectStream(streamId, config);

    return streamId;
  }

  /**
   * Stop a specific stream
   */
  stopStream(streamId: string): boolean {
    const stream = this.activeStreams.get(streamId);
    if (stream) {
      stream.close();
      this.activeStreams.delete(streamId);
      this.lastEntryIds.delete(streamId);
      this.reconnectAttempts.delete(streamId);
      this.failureCount.delete(streamId);
      this.backoffDelay.delete(streamId);
      console.log(`🛑 Stopped stream: ${streamId}`);
      return true;
    }
    return false;
  }

  /**
   * Stop all active streams
   */
  stopAllStreams(): void {
    console.log(`🛑 Stopping ${this.activeStreams.size} active streams`);
    this.activeStreams.forEach((stream) => stream.close());
    this.activeStreams.clear();
    this.lastEntryIds.clear();
    this.reconnectAttempts.clear();
    this.failureCount.clear();
    this.backoffDelay.clear();
  }

  /**
   * Get list of active stream IDs
   */
  getActiveStreams(): string[] {
    return Array.from(this.activeStreams.keys());
  }

  private generateStreamId(config: StreamConfig): string {
    const parts = [
      config.sport,
      ...config.sportsbooks.sort(),
      ...(config.leagues || []).sort(),
    ];
    return parts.join('-');
  }

  private connectStream(streamId: string, config: StreamConfig): void {
    // Reset all state at the START of connection attempt
    // This ensures clean state even if connection fails early
    this.reconnectAttempts.set(streamId, 0);
    this.failureCount.set(streamId, 0);
    this.backoffDelay.set(streamId, this.initialBackoffDelay);
    
    if (!this.apiKey) {
      console.error('❌ Cannot start stream: No API key configured');
      return;
    }

    const params = new URLSearchParams({
      key: this.apiKey,
    });

    // Add fixture_id if specified (REQUIRED according to OpticOdds docs)
    if (config.fixtureId) {
      params.append('fixture_id', config.fixtureId);
    }

    // Add sportsbook filters
    config.sportsbooks.forEach(sb => params.append('sportsbook', sb));

    // Add league filters if specified
    if (config.leagues) {
      config.leagues.forEach(league => params.append('league', league));
    }

    // Add market filters if specified
    if (config.markets) {
      config.markets.forEach(market => params.append('market', market));
    }

    // Only main lines if specified
    if (config.isMain) {
      params.append('is_main', 'true');
    }

    // Resume from last entry if reconnecting
    const lastEntryId = this.lastEntryIds.get(streamId);
    if (lastEntryId) {
      params.append('last_entry_id', lastEntryId);
      console.log(`📡 Resuming stream from entry: ${lastEntryId.substring(0, 8)}...`);
    }

    const url = `${this.baseUrl}/stream/odds/${config.sport}?${params.toString()}`;
    
    // Log the exact URL being attempted (with API key masked for security)
    const maskedUrl = url.replace(/key=[^&]+/, 'key=***MASKED***');
    console.log(`🔗 Attempting to connect to: ${maskedUrl}`);
    console.log(`   Sport: ${config.sport}`);
    console.log(`   Sportsbooks: ${config.sportsbooks.join(', ')}`);
    console.log(`   Leagues: ${config.leagues?.join(', ') || 'all'}`);
    console.log(`   Markets: ${config.markets?.join(', ') || 'all'}`);

    const eventSource = new EventSource(url);

    eventSource.onopen = () => {
      console.log(`✅ Stream ${streamId} connected`);
      // Reset all failure/reconnect/backoff state on successful connection
      this.reconnectAttempts.set(streamId, 0);
      this.failureCount.set(streamId, 0);
      this.backoffDelay.set(streamId, this.initialBackoffDelay);
    };

    eventSource.addEventListener('odds', (event: any) => {
      try {
        const data: StreamEvent = JSON.parse(event.data);
        this.lastEntryIds.set(streamId, data.entry_id);
        this.handleOddsUpdate(data.data);
        
        // Reset failure count and backoff delay on successful event
        this.failureCount.set(streamId, 0);
        this.reconnectAttempts.set(streamId, 0);
        this.backoffDelay.set(streamId, this.initialBackoffDelay);
      } catch (error) {
        console.error('❌ Error processing odds event:', error);
      }
    });

    eventSource.addEventListener('locked-odds', (event: any) => {
      try {
        const data: StreamEvent = JSON.parse(event.data);
        this.lastEntryIds.set(streamId, data.entry_id);
        this.handleLockedOdds(data.data);
        
        // Reset failure count and backoff delay on successful event
        this.failureCount.set(streamId, 0);
        this.reconnectAttempts.set(streamId, 0);
        this.backoffDelay.set(streamId, this.initialBackoffDelay);
      } catch (error) {
        console.error('❌ Error processing locked-odds event:', error);
      }
    });

    eventSource.addEventListener('heartbeat', () => {
      // Heartbeat received - connection is alive
      // Reset all failure/reconnect state on heartbeat
      this.failureCount.set(streamId, 0);
      this.reconnectAttempts.set(streamId, 0);
      this.backoffDelay.set(streamId, this.initialBackoffDelay);
    });

    eventSource.onerror = (error: any) => {
      const errorMsg = error.message || 'Connection lost';
      console.error(`❌ Stream ${streamId} error:`, errorMsg);
      
      // Increment failure count
      const failures = (this.failureCount.get(streamId) || 0) + 1;
      this.failureCount.set(streamId, failures);
      
      // Check if we should disable the stream after too many failures
      if (failures >= this.maxFailuresBeforeDisable) {
        console.error(`🛑 Stream ${streamId} disabled after ${failures} consecutive failures. API key may lack permissions.`);
        this.stopStream(streamId);
        return;
      }
      
      const attempts = this.reconnectAttempts.get(streamId) || 0;
      
      if (attempts < this.maxReconnectAttempts) {
        this.reconnectAttempts.set(streamId, attempts + 1);
        
        // Calculate exponential backoff delay
        const currentBackoff = this.backoffDelay.get(streamId) || this.initialBackoffDelay;
        const nextBackoff = Math.min(currentBackoff * 2, this.maxBackoffDelay);
        this.backoffDelay.set(streamId, nextBackoff);
        
        console.log(`🔄 Attempting reconnect ${attempts + 1}/${this.maxReconnectAttempts} in ${currentBackoff}ms... (Failure ${failures}/${this.maxFailuresBeforeDisable})`);
        
        setTimeout(() => {
          if (this.activeStreams.has(streamId)) {
            this.activeStreams.get(streamId)?.close();
            this.activeStreams.delete(streamId);
            this.connectStream(streamId, config);
          }
        }, currentBackoff);
      } else {
        console.error(`❌ Stream ${streamId} failed after ${this.maxReconnectAttempts} attempts`);
        this.stopStream(streamId);
      }
    };

    this.activeStreams.set(streamId, eventSource);
  }

  private async handleOddsUpdate(oddsData: StreamOddsEvent[]): Promise<void> {
    // Filter for player props only
    const playerProps = oddsData.filter(odd => 
      odd.player_id && 
      odd.points !== null &&
      this.isPlayerPropMarket(odd.market_id)
    );

    if (playerProps.length === 0) return;

    console.log(`📊 Processing ${playerProps.length} player prop updates from stream`);

    // Process each prop update
    for (const odd of playerProps) {
      try {
        // Extract player name from selection (format: "Player Name Over 25.5")
        const playerName = odd.selection
          .replace(/\s+(Over|Under)\s+[\d.]+/i, '')
          .trim();
        
        // Determine direction (over/under)
        const isOver = odd.selection.toLowerCase().includes('over');
        const direction: "over" | "under" = isOver ? "over" : "under";

        // Format stat name
        const statName = this.formatStatName(odd.market);
        
        // Normalize stat name for consistency across platforms
        const normalizedStat = normalizeStat(statName);

        // Look up team names from fixture cache
        const fixture = this.fixtureCache.get(odd.fixture_id);
        let team = "TBD";
        let opponent = "TBD";
        
        if (fixture) {
          // Default to home team, but check team_id if available
          team = fixture.homeTeam;
          opponent = fixture.awayTeam;
        }

        // Log warning if fixture_id is missing (for monitoring data quality)
        if (!odd.fixture_id) {
          console.warn(`⚠️  Missing fixture_id for ${odd.sportsbook}: ${playerName} ${normalizedStat} - will use global matching`);
        }

        // Debug: Log what we're about to upsert
        const fixtureDebug = odd.fixture_id || 'NULL';
        console.log(`  🔍 [DEBUG] Upserting ${playerName} ${normalizedStat} with fixtureId: ${fixtureDebug}`);

        // Run ML analysis to get real confidence scores
        const sport = this.inferSportFromMarket(odd.market_id);
        let confidence = 50;
        let ev = "0";
        let modelProbability = "0.5";
        
        console.log(`  🤖 Starting ML analysis for ${playerName} ${normalizedStat}...`);
        try {
          // Add 15-second timeout for ESPN API calls
          const analysisPromise = propAnalysisService.analyzeProp({
            sport,
            player: playerName,
            team,
            opponent,
            stat: normalizedStat,
            line: odd.points?.toString() || "0",
            direction,
            platform: odd.sportsbook,
            gameTime: new Date(),
          });
          
          const timeoutPromise = new Promise<never>((_, reject) => 
            setTimeout(() => reject(new Error('ML analysis timeout (15s)')), 15000)
          );
          
          const analysis = await Promise.race([analysisPromise, timeoutPromise]);
          
          confidence = analysis.confidence;
          ev = analysis.ev.toString();
          modelProbability = analysis.modelProbability.toString();
          console.log(`  ✅ ML analysis complete: confidence=${confidence}%`);
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          console.error(`  ⚠️  ML analysis failed for ${playerName} ${normalizedStat}: ${errorMessage}`);
        }

        // Upsert prop (create new or update existing)
        const result = await this.storage.upsertProp({
          sport,
          player: playerName,
          team,
          opponent,
          stat: normalizedStat,
          line: odd.points?.toString() || "0", // Handle null points gracefully
          direction,
          platform: odd.sportsbook,
          fixtureId: odd.fixture_id || null, // Store OpticOdds fixture ID (null if missing)
          marketId: odd.market_id,   // Store OpticOdds market ID
          confidence,
          ev,
          modelProbability,
          period: "full_game",
          gameTime: new Date(),
          isActive: true,
        });

        // Debug: Verify what was saved
        console.log(`  🔍 [DEBUG] Saved prop ID ${result.id} with fixtureId: ${result.fixtureId || 'NULL'}`);

        const fixtureTag = odd.fixture_id ? `[fixture: ${odd.fixture_id.substring(0, 8)}]` : '[no fixture_id]';
        console.log(`  ✅ ${odd.sportsbook}: ${playerName} ${statName} ${direction} ${odd.points} @ ${odd.price} ${fixtureTag}`);
      } catch (error) {
        console.error(`  ❌ Error processing prop:`, error);
      }
    }
  }

  private formatStatName(market: string): string {
    const marketMap: Record<string, string> = {
      // NBA Basic
      'player_points': 'Points',
      'player_rebounds': 'Rebounds',
      'player_assists': 'Assists',
      'player_threes': '3-PT Made',
      'player_three_pointers_made': '3-PT Made',
      'player_three_pointers_attempted': '3-PT Attempted',
      'player_blocks': 'Blocks',
      'player_steals': 'Steals',
      'player_turnovers': 'Turnovers',
      'player_fouls': 'Personal Fouls',
      'player_personal_fouls': 'Personal Fouls',
      // NBA Combo
      'player_pts_rebs_asts': 'Pts+Rebs+Asts',
      'player_pts_rebs': 'Pts+Rebs',
      'player_pts_asts': 'Pts+Asts',
      'player_rebs_asts': 'Rebs+Asts',
      'player_blocks_steals': 'Blks+Stls',
      // NBA Other
      'player_fantasy_score': 'Fantasy Score',
      'player_fg_attempted': 'FG Attempted',
      'player_fg_made': 'FG Made',
      'player_two_pointers_made': 'Two Pointers Made',
      'player_two_pointers_attempted': 'Two Pointers Attempted',
      'player_free_throws_made': 'Free Throws Made',
      'player_free_throws_attempted': 'Free Throws Attempted',
      'player_offensive_rebounds': 'Offensive Rebounds',
      'player_defensive_rebounds': 'Defensive Rebounds',
      'player_dunks': 'Dunks',
      'player_blocked_shots': 'Blocked Shots',
      // NBA Period-specific
      'player_points_1q': 'Points 1Q',
      'player_rebounds_1q': 'Rebounds 1Q',
      'player_assists_1q': 'Assists 1Q',
      'player_points_1h': 'Points 1H',
      'player_rebounds_1h': 'Rebounds 1H',
      'player_assists_1h': 'Assists 1H',
      // NFL Basic
      'player_passing_yards': 'Passing Yards',
      'player_passing_tds': 'Passing TDs',
      'player_rushing_yards': 'Rushing Yards',
      'player_rushing_tds': 'Rushing TDs',
      'player_receiving_yards': 'Receiving Yards',
      'player_receiving_tds': 'Receiving TDs',
      'player_receptions': 'Receptions',
      'player_pass_attempts': 'Pass Attempts',
      'player_completions': 'Completions',
      'player_rush_attempts': 'Rush Attempts',
      'player_interceptions': 'Interceptions',
      // NFL Combo
      'player_rush_rec_yards': 'Rush+Rec Yards',
      'player_rush_rec_tds': 'Rush+Rec TDs',
      'player_pass_rush_yards': 'Pass+Rush Yards',
      // NFL Other
      'player_fantasy_score': 'Fantasy Score',
      'player_sacks': 'Sacks',
      'player_fg_made': 'FGs Made',
      'player_kicking_points': 'Kicking Points',
      'player_pat_made': 'PAT Made',
      'player_longest_completion': 'Longest Completion',
      'player_longest_rush': 'Longest Rush',
      'player_tackles_assists': 'Tackles+Assists',
      'player_punts': 'Punts',
      'player_completion_percentage': 'Completion %',
      // NFL Period-specific
      'player_passing_yards_1q': 'Passing Yards 1Q',
      'player_rushing_yards_1q': 'Rushing Yards 1Q',
      'player_receiving_yards_1q': 'Receiving Yards 1Q',
      'player_passing_yards_1h': 'Passing Yards 1H',
      'player_rushing_yards_1h': 'Rushing Yards 1H',
      'player_receiving_yards_1h': 'Receiving Yards 1H',
      // NHL
      'player_hits': 'Hits',
      'player_time_on_ice': 'Time On Ice',
      'player_faceoffs_won': 'Faceoffs Won',
      'goalie_saves': 'Goalie Saves',
      'goalie_goals_allowed': 'Goals Allowed',
      'player_blocked_shots': 'Blocked Shots',
    };
    return marketMap[market] || market;
  }

  private inferSportFromMarket(marketId: string): string {
    // Basketball markets
    if (marketId.includes('points') || marketId.includes('rebounds') || marketId.includes('assists')) {
      return 'NBA';
    }
    // Hockey markets
    if (marketId.includes('goals') || marketId.includes('saves')) {
      return 'NHL';
    }
    // Football markets
    if (marketId.includes('passing') || marketId.includes('rushing') || marketId.includes('receiving')) {
      return 'NFL';
    }
    return 'NBA'; // Default
  }

  private async handleLockedOdds(oddsData: StreamOddsEvent[]): Promise<void> {
    console.log(`🔒 ${oddsData.length} markets locked - marking props inactive`);
    
    // When odds are locked (game started/market closed), deactivate related props
    const fixtureSet = new Set(oddsData.map(odd => odd.fixture_id));
    const lockedFixtures = Array.from(fixtureSet);
    
    if (lockedFixtures.length > 0) {
      console.log(`  Deactivating props for ${lockedFixtures.length} fixtures`);
      
      // Deactivate props for each locked fixture with deadlock retry
      for (const fixtureId of lockedFixtures) {
        const maxRetries = 3;
        let success = false;
        
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
          try {
            const count = await this.storage.deactivatePropsByFixtureId(fixtureId);
            if (count > 0) {
              console.log(`    🔒 Deactivated ${count} props for locked fixture ${fixtureId.substring(0, 8)}...`);
            }
            success = true;
            break;
          } catch (error: any) {
            const isDeadlock = error?.code === '40P01';
            
            if (isDeadlock && attempt < maxRetries) {
              const delay = Math.pow(2, attempt - 1) * 100;
              console.warn(`  ⚠️  Deadlock on fixture ${fixtureId.substring(0, 8)}, retry ${attempt}/${maxRetries} in ${delay}ms`);
              await new Promise(resolve => setTimeout(resolve, delay));
            } else if (!isDeadlock || attempt === maxRetries) {
              console.error(`  ❌ Failed to deactivate fixture ${fixtureId.substring(0, 8)}:`, error);
              break;
            }
          }
        }
      }
    }
  }

  private isPlayerPropMarket(marketId: string): boolean {
    const playerPropMarkets = [
      // NBA
      'player_points',
      'player_rebounds',
      'player_assists',
      'player_threes',
      'player_pts_rebs_asts',
      'player_pts_rebs',
      'player_pts_asts',
      'player_rebs_asts',
      'player_blocks',
      'player_steals',
      'player_turnovers',
      'player_blocks_steals',
      'player_double_double',
      'player_triple_double',
      'player_shots_made',
      'player_first_basket',
      // NHL
      'player_goals',
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
      'player_rushing_tds',
      'player_receiving_yards',
      'player_receptions',
      'player_receiving_tds',
      'player_pass_completions',
      'player_pass_attempts',
      'player_rush_attempts',
      'player_longest_rush',
      'player_longest_reception',
      // MLB
      'pitcher_strikeouts',
      'batter_hits',
      'batter_total_bases',
      'batter_rbis',
      'batter_runs_scored',
      'batter_home_runs',
      'batter_stolen_bases',
    ];

    return playerPropMarkets.includes(marketId);
  }
}

export const opticOddsStreamService = new OpticOddsStreamService();
