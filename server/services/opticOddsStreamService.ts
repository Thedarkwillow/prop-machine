import { EventSource } from 'eventsource';
import type { IStorage } from '../storage';
import { storage } from '../storage';

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

export class OpticOddsStreamService {
  private storage: IStorage;
  private apiKey: string;
  private baseUrl = 'https://api.opticodds.com/api/v3';
  private activeStreams: Map<string, EventSource> = new Map();
  private lastEntryIds: Map<string, string> = new Map();
  private reconnectAttempts: Map<string, number> = new Map();
  private maxReconnectAttempts = 5;
  private reconnectDelay = 5000;

  constructor(storageInstance: IStorage = storage) {
    this.storage = storageInstance;
    this.apiKey = process.env.OPTICODDS_API_KEY || '';

    if (!this.apiKey) {
      console.warn('⚠️  No OPTICODDS_API_KEY configured for streaming');
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
      this.reconnectAttempts.set(streamId, 0);
    };

    eventSource.addEventListener('odds', (event: any) => {
      try {
        const data: StreamEvent = JSON.parse(event.data);
        this.lastEntryIds.set(streamId, data.entry_id);
        this.handleOddsUpdate(data.data);
      } catch (error) {
        console.error('❌ Error processing odds event:', error);
      }
    });

    eventSource.addEventListener('locked-odds', (event: any) => {
      try {
        const data: StreamEvent = JSON.parse(event.data);
        this.lastEntryIds.set(streamId, data.entry_id);
        this.handleLockedOdds(data.data);
      } catch (error) {
        console.error('❌ Error processing locked-odds event:', error);
      }
    });

    eventSource.addEventListener('heartbeat', () => {
      // Heartbeat received - connection is alive
    });

    eventSource.onerror = (error: any) => {
      console.error(`❌ Stream ${streamId} error:`, error.message || 'Connection lost');
      
      const attempts = this.reconnectAttempts.get(streamId) || 0;
      
      if (attempts < this.maxReconnectAttempts) {
        this.reconnectAttempts.set(streamId, attempts + 1);
        console.log(`🔄 Attempting reconnect ${attempts + 1}/${this.maxReconnectAttempts} in ${this.reconnectDelay}ms...`);
        
        setTimeout(() => {
          if (this.activeStreams.has(streamId)) {
            this.activeStreams.get(streamId)?.close();
            this.activeStreams.delete(streamId);
            this.connectStream(streamId, config);
          }
        }, this.reconnectDelay);
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

    console.log(`📊 Processing ${playerProps.length} player prop updates`);

    // TODO: Process and update props in database
    // For now, just log the updates
    for (const odd of playerProps) {
      console.log(`  ${odd.sportsbook}: ${odd.selection} ${odd.market} ${odd.points} @ ${odd.price}`);
    }
  }

  private async handleLockedOdds(oddsData: StreamOddsEvent[]): Promise<void> {
    console.log(`🔒 ${oddsData.length} markets locked`);
    // TODO: Mark props as inactive in database
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
