import { storage } from "../storage";
import { balldontlieClient } from "../integrations/balldontlieClient";
import type { Bet, Prop, GameEvent } from "@shared/schema";

export interface SettlementResult {
  betId: number;
  outcome: 'won' | 'lost' | 'pushed';
  closingLine: string;
  clv: string;
  actualValue: number;
  reason: string;
}

export interface SettlementReport {
  gamesProcessed: number;
  betsSettled: number;
  wins: number;
  losses: number;
  pushes: number;
  totalBankrollChange: number;
  results: SettlementResult[];
  errors: string[];
}

export class SettlementService {
  private lastProcessedTimestamp: Date = new Date(0);
  
  /**
   * Main settlement routine - processes all pending bets
   */
  async settlePendingBets(sport?: string): Promise<SettlementReport> {
    const report: SettlementReport = {
      gamesProcessed: 0,
      betsSettled: 0,
      wins: 0,
      losses: 0,
      pushes: 0,
      totalBankrollChange: 0,
      results: [],
      errors: [],
    };
    
    try {
      // Get all pending games that should be finalized
      const pendingGames = await storage.getPendingGames(sport);
      const now = new Date();
      
      // Filter games that should be complete (game time + 4 hours)
      const gamesToCheck = pendingGames.filter(game => {
        const gameTime = new Date(game.gameTime);
        const hoursElapsed = (now.getTime() - gameTime.getTime()) / (1000 * 60 * 60);
        return hoursElapsed >= 3; // Check games 3+ hours after start
      });
      
      console.log(`Checking ${gamesToCheck.length} games for settlement...`);
      
      // Process each game
      for (const game of gamesToCheck) {
        try {
          const settled = await this.settleGameBets(game);
          report.gamesProcessed++;
          
          for (const result of settled.results) {
            report.results.push(result);
            report.betsSettled++;
            
            if (result.outcome === 'won') report.wins++;
            else if (result.outcome === 'lost') report.losses++;
            else report.pushes++;
            
            report.totalBankrollChange += settled.bankrollChanges[result.betId] || 0;
          }
        } catch (error) {
          const err = error as Error;
          report.errors.push(`Game ${game.gameId}: ${err.message}`);
          console.error(`Error settling game ${game.gameId}:`, error);
        }
      }
      
      console.log(`Settlement complete: ${report.betsSettled} bets settled`);
      console.log(`Wins: ${report.wins}, Losses: ${report.losses}, Pushes: ${report.pushes}`);
      
    } catch (error) {
      const err = error as Error;
      report.errors.push(`Settlement service error: ${err.message}`);
      console.error('Settlement service error:', error);
    }
    
    return report;
  }
  
  /**
   * Settle all bets for a specific game
   */
  private async settleGameBets(game: GameEvent): Promise<{
    results: SettlementResult[];
    bankrollChanges: Record<number, number>;
  }> {
    const results: SettlementResult[] = [];
    const bankrollChanges: Record<number, number> = {};
    
    // Fetch final game stats based on sport
    let playerStats: Record<string, any> = {};
    
    if (game.sport === 'NBA') {
      // For now, use stored player stats from game event
      playerStats = game.playerStats as any || {};
    }
    
    // Update game event to final status
    if (game.status !== 'final') {
      await storage.updateGameEvent(game.gameId, {
        status: 'final',
        finalizedAt: new Date(),
      });
    }
    
    // Get all active props for this game's teams
    const allProps = await storage.getAllActiveProps();
    const gameProps = allProps.filter(prop => 
      (prop.team === game.homeTeam || prop.team === game.awayTeam) &&
      new Date(prop.gameTime).getTime() === new Date(game.gameTime).getTime()
    );
    
    // For each prop, find pending bets and settle them
    for (const prop of gameProps) {
      const propResults = await this.settleProp(prop, playerStats);
      
      for (const result of propResults) {
        results.push(result);
        
        // Actually settle the bet in the database
        const settleResult = await storage.settleBetWithBankrollUpdate(
          result.betId,
          result.outcome,
          result.closingLine,
          result.clv
        );
        
        if (settleResult.success) {
          bankrollChanges[result.betId] = settleResult.bankrollChange;
        }
      }
    }
    
    return { results, bankrollChanges };
  }
  
  /**
   * Settle a specific prop
   */
  private async settleProp(
    prop: Prop,
    playerStats: Record<string, any>
  ): Promise<SettlementResult[]> {
    const results: SettlementResult[] = [];
    
    // Get the player's actual stat value
    const actualValue = this.getPlayerStatValue(prop.player, prop.stat, playerStats);
    
    if (actualValue === null) {
      console.warn(`No stats found for ${prop.player} - ${prop.stat}`);
      return results;
    }
    
    // Get all pending bets for this prop across all users
    // Note: This is inefficient - ideally we'd have getBetsByProp(propId)
    // For now, we'll need to get all users' bets and filter
    // In production, add a getBetsByProp method to storage interface
    const allUsers = ['seed-user-1']; // TODO: Get all user IDs from database
    let propBets: any[] = [];
    
    for (const userId of allUsers) {
      const userBets = await storage.getBetsWithProps(userId);
      const userPropBets = userBets.filter(bet => bet.propId === prop.id && bet.status === 'pending');
      propBets.push(...userPropBets);
    }
    
    // Determine outcome for each bet
    for (const bet of propBets) {
      const line = parseFloat(prop.line);
      const closingLine = prop.currentLine ? prop.currentLine : prop.line;
      
      let outcome: 'won' | 'lost' | 'pushed';
      let clv = '0.0';
      
      // Calculate closing line value
      if (prop.currentLine) {
        const openingLine = parseFloat(prop.line);
        const closing = parseFloat(prop.currentLine);
        const lineMovement = closing - openingLine;
        
        // CLV calculation: positive if line moved in our favor
        if (prop.direction === 'over') {
          clv = ((openingLine - closing) * 2).toFixed(1); // Lower line = better for over
        } else {
          clv = ((closing - openingLine) * 2).toFixed(1); // Higher line = better for under
        }
      }
      
      // Determine win/loss/push
      if (Math.abs(actualValue - line) < 0.01) {
        outcome = 'pushed';
      } else if (prop.direction === 'over') {
        outcome = actualValue > line ? 'won' : 'lost';
      } else {
        outcome = actualValue < line ? 'won' : 'lost';
      }
      
      results.push({
        betId: bet.id,
        outcome,
        closingLine: closingLine.toString(),
        clv,
        actualValue,
        reason: `${prop.player} ${prop.stat}: ${actualValue} vs line ${line} (${prop.direction})`,
      });
    }
    
    return results;
  }
  
  /**
   * Extract player stat value from game stats
   */
  private getPlayerStatValue(
    playerName: string,
    stat: string,
    playerStats: Record<string, any>
  ): number | null {
    // This is simplified - in production you'd need proper player matching
    const stats = playerStats[playerName];
    if (!stats) return null;
    
    // Map stat names to actual stat keys
    const statMap: Record<string, string> = {
      'Points': 'pts',
      'Rebounds': 'reb',
      'Assists': 'ast',
      'Threes': 'fg3m',
      'SOG': 'shots', // Shots on goal (hockey) - would need different API
      'Saves': 'saves',
      'Pass Yards': 'passing_yards',
      'Pass TDs': 'passing_tds',
      'Rush Yards': 'rushing_yards',
      'Receptions': 'receptions',
      'Hits': 'hits',
      'Total Bases': 'total_bases',
      'Strikeouts': 'strikeouts',
      'Runs + RBIs': 'runs_rbis',
    };
    
    const statKey = statMap[stat] || stat.toLowerCase();
    return stats[statKey] ?? null;
  }
  
  /**
   * Create performance snapshot after settlement
   */
  async createPerformanceSnapshot(userId: string): Promise<void> {
    try {
      const user = await storage.getUser(userId);
      if (!user) return;
      
      const allBets = await storage.getBetsByUser(userId);
      const settledBets = allBets.filter(bet => bet.status !== 'pending');
      
      if (settledBets.length === 0) return;
      
      const wins = settledBets.filter(bet => bet.status === 'won').length;
      const losses = settledBets.filter(bet => bet.status === 'lost').length;
      const pushes = settledBets.filter(bet => bet.status === 'pushed').length;
      
      const totalAmount = settledBets.reduce((sum, bet) => sum + parseFloat(bet.amount), 0);
      const totalReturns = settledBets
        .filter(bet => bet.status === 'won')
        .reduce((sum, bet) => sum + parseFloat(bet.potentialReturn || '0'), 0);
      
      const roi = totalAmount > 0 ? ((totalReturns - totalAmount) / totalAmount) * 100 : 0;
      const winRate = settledBets.length > 0 ? (wins / settledBets.length) * 100 : 0;
      
      const betsWithClv = settledBets.filter(bet => bet.clv);
      const avgClv = betsWithClv.length > 0
        ? betsWithClv.reduce((sum, bet) => sum + parseFloat(bet.clv || '0'), 0) / betsWithClv.length
        : 0;
      
      await storage.createSnapshot({
        userId,
        date: new Date(),
        bankroll: user.bankroll,
        totalBets: settledBets.length,
        wins,
        losses,
        pushes,
        winRate: winRate.toFixed(2),
        roi: roi.toFixed(2),
        avgClv: avgClv.toFixed(2),
        kellyCompliance: '95.0', // Placeholder - would need actual Kelly calculation
      });
      
      console.log(`Performance snapshot created for user ${userId}`);
    } catch (error) {
      console.error('Error creating performance snapshot:', error);
    }
  }
}

export const settlementService = new SettlementService();
