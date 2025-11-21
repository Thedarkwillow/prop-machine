import { EventSource } from 'eventsource';
import type { IStorage } from '../storage';
import { storage } from '../storage';

interface GameResult {
  fixture_id: string;
  sport: string;
  league: string;
  start_date: string;
  status: 'completed' | 'in_progress' | 'scheduled';
  home_team: string;
  away_team: string;
  home_score?: number;
  away_score?: number;
  period?: string;
  time_remaining?: string;
}

interface PlayerStat {
  player_id: string;
  player_name: string;
  team_id: string;
  stats: Record<string, number>; // e.g., { points: 25, rebounds: 10, assists: 5 }
}

interface ResultsEvent {
  event: 'fixture-results' | 'heartbeat';
  entry_id: string;
  data: {
    fixture: GameResult;
    player_stats?: PlayerStat[];
  };
}

interface ResultsStreamConfig {
  sport: string;
  leagues?: string[];
}

export class OpticOddsResultsStreamService {
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
      console.warn('⚠️  No OPTICODDS_API_KEY configured for results streaming');
    }
  }

  /**
   * Start streaming live game results for a specific sport
   */
  startResultsStream(config: ResultsStreamConfig): string {
    const streamId = this.generateStreamId(config);

    if (this.activeStreams.has(streamId)) {
      console.log(`📊 Results stream ${streamId} already active`);
      return streamId;
    }

    console.log(`📊 Starting OpticOdds results stream: ${streamId}`);
    this.connectStream(streamId, config);

    return streamId;
  }

  /**
   * Stop a specific results stream
   */
  stopStream(streamId: string): boolean {
    const stream = this.activeStreams.get(streamId);
    if (stream) {
      stream.close();
      this.activeStreams.delete(streamId);
      this.lastEntryIds.delete(streamId);
      this.reconnectAttempts.delete(streamId);
      console.log(`🛑 Stopped results stream: ${streamId}`);
      return true;
    }
    return false;
  }

  /**
   * Stop all active results streams
   */
  stopAllStreams(): void {
    console.log(`🛑 Stopping ${this.activeStreams.size} active results streams`);
    this.activeStreams.forEach((stream) => stream.close());
    this.activeStreams.clear();
    this.lastEntryIds.clear();
    this.reconnectAttempts.clear();
  }

  /**
   * Get list of active results stream IDs
   */
  getActiveStreams(): string[] {
    return Array.from(this.activeStreams.keys());
  }

  private generateStreamId(config: ResultsStreamConfig): string {
    const parts = [
      'results',
      config.sport,
      ...(config.leagues || []).sort(),
    ];
    return parts.join('-');
  }

  private connectStream(streamId: string, config: ResultsStreamConfig): void {
    if (!this.apiKey) {
      console.error('❌ Cannot start results stream: No API key configured');
      return;
    }

    const params = new URLSearchParams({
      key: this.apiKey,
    });

    // Add league filters if specified
    if (config.leagues) {
      config.leagues.forEach(league => params.append('league', league));
    }

    // Resume from last entry if reconnecting
    const lastEntryId = this.lastEntryIds.get(streamId);
    if (lastEntryId) {
      params.append('last_entry_id', lastEntryId);
      console.log(`📊 Resuming results stream from entry: ${lastEntryId.substring(0, 8)}...`);
    }

    const url = `${this.baseUrl}/stream/results/${config.sport}?${params.toString()}`;

    const eventSource = new EventSource(url);

    eventSource.onopen = () => {
      console.log(`✅ Results stream ${streamId} connected`);
      this.reconnectAttempts.set(streamId, 0);
    };

    eventSource.addEventListener('fixture-results', (event: any) => {
      try {
        const data: ResultsEvent = JSON.parse(event.data);
        this.lastEntryIds.set(streamId, data.entry_id);
        this.handleResultsUpdate(data.data);
      } catch (error) {
        console.error('❌ Error processing fixture-results event:', error);
      }
    });

    eventSource.addEventListener('heartbeat', () => {
      // Heartbeat received - connection is alive
    });

    eventSource.onerror = (error: any) => {
      console.error(`❌ Results stream ${streamId} error:`, error.message || 'Connection lost');
      
      const attempts = this.reconnectAttempts.get(streamId) || 0;
      
      if (attempts < this.maxReconnectAttempts) {
        this.reconnectAttempts.set(streamId, attempts + 1);
        console.log(`🔄 Attempting results stream reconnect ${attempts + 1}/${this.maxReconnectAttempts} in ${this.reconnectDelay}ms...`);
        
        setTimeout(() => {
          if (this.activeStreams.has(streamId)) {
            this.activeStreams.get(streamId)?.close();
            this.activeStreams.delete(streamId);
            this.connectStream(streamId, config);
          }
        }, this.reconnectDelay);
      } else {
        console.error(`❌ Results stream ${streamId} failed after ${this.maxReconnectAttempts} attempts`);
        this.stopStream(streamId);
      }
    };

    this.activeStreams.set(streamId, eventSource);
  }

  private async handleResultsUpdate(resultsData: { fixture: GameResult; player_stats?: PlayerStat[] }): Promise<void> {
    const { fixture, player_stats } = resultsData;

    console.log(`🏀 Game Update: ${fixture.away_team} @ ${fixture.home_team} - ${fixture.status}`);
    
    if (fixture.status === 'completed' && player_stats) {
      console.log(`✅ Final: ${fixture.away_team} ${fixture.away_score} @ ${fixture.home_team} ${fixture.home_score}`);
      console.log(`📊 Player stats available for ${player_stats.length} players`);
      
      // TODO: Grade bets based on final stats
      await this.gradeBetsForFixture(fixture.fixture_id, player_stats);
    } else if (fixture.status === 'in_progress') {
      console.log(`⏱️  Live: ${fixture.away_team} ${fixture.away_score} @ ${fixture.home_team} ${fixture.home_score} - ${fixture.period} ${fixture.time_remaining}`);
    }
  }

  private async gradeBetsForFixture(fixtureId: string, playerStats: PlayerStat[]): Promise<void> {
    // TODO: Implement bet grading logic
    // 1. Find all active bets for this fixture
    // 2. Compare player stats against prop lines
    // 3. Mark bets as won/lost
    // 4. Update user bankrolls
    
    console.log(`🎯 Grading bets for fixture ${fixtureId} with ${playerStats.length} player stats`);
  }
}

export const opticOddsResultsStreamService = new OpticOddsResultsStreamService();
