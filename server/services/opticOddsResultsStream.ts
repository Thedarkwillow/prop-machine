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
    console.log(`🎯 Grading bets for fixture ${fixtureId} with ${playerStats.length} player stats`);
    
    try {
      const settledBetIds: number[] = [];
      
      for (const playerStat of playerStats) {
        // For each stat category, grade relevant bets
        for (const [statName, statValue] of Object.entries(playerStat.stats)) {
          const betIds = await this.gradeBetsForPlayerStat(
            playerStat.player_name,
            statName,
            statValue,
            fixtureId
          );
          settledBetIds.push(...betIds);
        }
      }

      // After all bets settled, update slip statuses
      if (settledBetIds.length > 0) {
        await this.updateSlipStatuses(settledBetIds);
      }
    } catch (error) {
      console.error(`❌ Error grading bets for fixture ${fixtureId}:`, error);
    }
  }

  private async gradeBetsForPlayerStat(
    playerName: string,
    statName: string,
    actualValue: number,
    fixtureId: string
  ): Promise<number[]> {
    const settledBetIds: number[] = [];
    try {
      // Strategy: Prefer fixture-scoped props for accuracy, but fall back to global if needed
      const fixtureProps = await this.storage.getActivePropsByFixtureId(fixtureId);
      const fixtureScopedProps = fixtureProps.filter(
        prop => 
          prop.player.toLowerCase() === playerName.toLowerCase() &&
          prop.stat.toLowerCase().includes(statName.toLowerCase()) &&
          prop.fixtureId !== null
      );

      // If we have fixture-scoped props, use those (most accurate)
      let matchingProps = fixtureScopedProps;

      // Otherwise, fall back to global props for this player (backward compatibility)
      if (matchingProps.length === 0) {
        console.warn(`⚠️  No fixture-scoped props for ${playerName} ${statName} - checking global props`);
        const allActiveProps = await this.storage.getAllActiveProps();
        matchingProps = allActiveProps.filter(
          prop =>
            prop.player.toLowerCase() === playerName.toLowerCase() &&
            prop.stat.toLowerCase().includes(statName.toLowerCase()) &&
            prop.fixtureId === null // Only match legacy props without fixture_id
        );
        
        if (matchingProps.length > 0) {
          console.log(`  📋 Found ${matchingProps.length} legacy props (no fixture_id) for ${playerName} ${statName}`);
        }
      }

      if (matchingProps.length === 0) return settledBetIds;

      console.log(`  📊 Found ${matchingProps.length} props for ${playerName} ${statName} (actual: ${actualValue})`);

      // Grade each prop
      for (const prop of matchingProps) {
        const propLine = parseFloat(prop.line);
        let outcome: 'won' | 'lost' | 'pushed';

        if (prop.direction === 'over') {
          if (actualValue > propLine) {
            outcome = 'won';
          } else if (actualValue < propLine) {
            outcome = 'lost';
          } else {
            outcome = 'pushed';
          }
        } else { // under
          if (actualValue < propLine) {
            outcome = 'won';
          } else if (actualValue > propLine) {
            outcome = 'lost';
          } else {
            outcome = 'pushed';
          }
        }

        console.log(`    ${prop.direction === 'over' ? '📈' : '📉'} ${playerName} ${prop.stat} ${prop.direction} ${prop.line}: ${outcome.toUpperCase()} (actual: ${actualValue})`);

        // Find all pending bets on this prop
        const propBets = await this.storage.getBetsByPropId(prop.id);
        const pendingBets = propBets.filter(bet => bet.status === 'pending');

        if (pendingBets.length > 0) {
          console.log(`      🎯 Settling ${pendingBets.length} pending bet(s)...`);
        }

        // Settle each pending bet
        for (const bet of pendingBets) {
          try {
            const result = await this.storage.settleBetWithBankrollUpdate(
              bet.id,
              outcome,
              actualValue.toString() // closing line
            );

            if (result.success) {
              const emoji = outcome === 'won' ? '✅' : outcome === 'lost' ? '❌' : '🔄';
              const changeText = result.bankrollChange > 0 
                ? `+$${result.bankrollChange.toFixed(2)}`
                : result.bankrollChange < 0
                ? `-$${Math.abs(result.bankrollChange).toFixed(2)}`
                : '$0.00';
              
              console.log(`        ${emoji} Bet #${bet.id} ${outcome}: ${changeText}`);
              settledBetIds.push(bet.id);
            } else {
              console.error(`        ❌ Failed to settle bet #${bet.id}: ${result.error}`);
            }
          } catch (error) {
            console.error(`        ❌ Error settling bet #${bet.id}:`, error);
          }
        }
      }
      
      // Deactivate all props for this fixture (more efficient than per-prop deactivation)
      if (matchingProps.length > 0) {
        const count = await this.storage.deactivatePropsByFixtureId(fixtureId);
        if (count > 0) {
          console.log(`    🔒 Deactivated ${count} props for completed fixture ${fixtureId.substring(0, 8)}...`);
        }
      }
    } catch (error) {
      console.error(`❌ Error grading ${playerName} ${statName}:`, error);
    }
    
    return settledBetIds;
  }

  /**
   * Update slip statuses after bets are settled
   */
  private async updateSlipStatuses(settledBetIds: number[]): Promise<void> {
    try {
      // Get unique slip IDs from settled bets
      const slipIds = new Set<number>();
      
      for (const betId of settledBetIds) {
        const bet = await this.storage.getBet(betId);
        if (bet?.slipId) {
          slipIds.add(bet.slipId);
        }
      }

      if (slipIds.size === 0) return;

      console.log(`📋 Checking ${slipIds.size} slip(s) for status updates...`);

      // For each slip, check if all bets are settled
      for (const slipId of Array.from(slipIds)) {
        const slip = await this.storage.getSlip(slipId);
        if (!slip) continue;

        // Get all bets in this slip
        const slipBetIds = (slip.picks as any[]).map((pick: any) => pick.betId).filter(Boolean);
        if (slipBetIds.length === 0) continue;

        // Fetch all bets
        const slipBets = await Promise.all(
          slipBetIds.map((id: number) => this.storage.getBet(id))
        );

        const validBets = slipBets.filter(b => b !== undefined);
        if (validBets.length === 0) continue;

        // Check if all bets are settled
        const allSettled = validBets.every(bet => bet.status !== 'pending');
        if (!allSettled) continue;

        // Determine slip outcome
        const wonCount = validBets.filter(b => b.status === 'won').length;
        const lostCount = validBets.filter(b => b.status === 'lost').length;
        
        let slipStatus: 'won' | 'lost' | 'pushed';
        if (lostCount > 0) {
          slipStatus = 'lost'; // Any loss means slip lost
        } else if (wonCount === validBets.length) {
          slipStatus = 'won'; // All won means slip won
        } else {
          slipStatus = 'pushed'; // Mix of won/pushed means slip pushed
        }

        await this.storage.updateSlipStatus(slipId, slipStatus);
        console.log(`  📋 Slip #${slipId}: ${slipStatus.toUpperCase()} (${wonCount}W ${lostCount}L ${validBets.length - wonCount - lostCount}P)`);
      }
    } catch (error) {
      console.error('❌ Error updating slip statuses:', error);
    }
  }
}

export const opticOddsResultsStreamService = new OpticOddsResultsStreamService();
