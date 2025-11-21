import { EventSource } from 'eventsource';
import type { IStorage } from '../storage';
import { storage } from '../storage';
import { opticOddsClient } from '../integrations/opticOddsClient';

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
          console.warn(`⚠️  Missing fixture_id for ${odd.sportsbook}: ${playerName} ${statName} - will use global matching`);
        }

        // Upsert prop (create new or update existing)
        await this.storage.upsertProp({
          sport: this.inferSportFromMarket(odd.market_id),
          player: playerName,
          team,
          opponent,
          stat: statName,
          line: odd.points.toString(),
          direction,
          odds: odd.price,
          platform: odd.sportsbook,
          fixtureId: odd.fixture_id || null, // Store OpticOdds fixture ID (null if missing)
          marketId: odd.market_id,   // Store OpticOdds market ID
          confidence: 0.5, // Placeholder - would be calculated by ML model
          ev: "0",
          modelProbability: "0.5",
          period: "full_game",
          gameTime: new Date(),
          isActive: true,
        });

        const fixtureTag = odd.fixture_id ? `[fixture: ${odd.fixture_id.substring(0, 8)}]` : '[no fixture_id]';
        console.log(`  ✅ ${odd.sportsbook}: ${playerName} ${statName} ${direction} ${odd.points} @ ${odd.price} ${fixtureTag}`);
      } catch (error) {
        console.error(`  ❌ Error processing prop:`, error);
      }
    }
  }

  private formatStatName(market: string): string {
    const marketMap: Record<string, string> = {
      'player_points': 'Points',
      'player_rebounds': 'Rebounds',
      'player_assists': 'Assists',
      'player_threes': '3-Pointers Made',
      'player_pts_rebs_asts': 'Pts+Rebs+Asts',
      'player_pts_rebs': 'Pts+Rebs',
      'player_pts_asts': 'Pts+Asts',
      'player_rebs_asts': 'Rebs+Asts',
      'player_blocks': 'Blocks',
      'player_steals': 'Steals',
      'player_turnovers': 'Turnovers',
      'player_blocks_steals': 'Blks+Stls',
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
    const lockedFixtures = [...new Set(oddsData.map(odd => odd.fixture_id))];
    
    if (lockedFixtures.length > 0) {
      console.log(`  Deactivating props for ${lockedFixtures.length} fixtures`);
      
      // Deactivate props for each locked fixture
      for (const fixtureId of lockedFixtures) {
        const count = await this.storage.deactivatePropsByFixtureId(fixtureId);
        if (count > 0) {
          console.log(`    🔒 Deactivated ${count} props for locked fixture ${fixtureId.substring(0, 8)}...`);
        }
      }
    }
  }

  private isPlayerPropMarket(marketId: string): boolean {
    const playerPropMarkets = [
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
    ];

    return playerPropMarkets.includes(marketId);
  }
}

export const opticOddsStreamService = new OpticOddsStreamService();
