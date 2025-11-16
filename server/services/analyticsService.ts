import type { IStorage } from "../storage";
import type { Bet, Prop, Slip, InsertAnalyticsSnapshot } from "@shared/schema";

interface SportPerformance {
  sport: string;
  wins: number;
  losses: number;
  pushes: number;
  totalBets: number;
  winRate: number;
  roi: number;
  totalStaked: number;
  totalReturned: number;
}

interface PlatformPerformance {
  platform: string;
  wins: number;
  losses: number;
  pushes: number;
  totalBets: number;
  winRate: number;
  roi: number;
}

interface ConfidenceBracket {
  bracket: string;
  predictedWinRate: number;
  actualWinRate: number;
  totalBets: number;
  accuracy: number;
}

export class AnalyticsService {
  constructor(private storage: IStorage) {}

  async generateSnapshot(userId: string): Promise<void> {
    try {
      const betsWithProps = await this.storage.getBetsWithProps(userId);
      const settledBets = betsWithProps.filter(bet => bet.status !== 'pending');

      if (settledBets.length === 0) {
        console.log("No settled bets to analyze");
        return;
      }

      const platformStats = this.calculatePlatformStats(settledBets);
      const sportStats = this.calculateSportStats(settledBets);
      const confidenceBrackets = this.calculateConfidenceBrackets(settledBets);
      const streaks = this.calculateStreaks(settledBets);
      const bestPerformers = this.findBestPerformers(sportStats, platformStats);
      const avgBetSize = this.calculateAverageBetSize(settledBets);

      const snapshot: InsertAnalyticsSnapshot = {
        userId,
        date: new Date(),
        platformStats,
        sportStats,
        confidenceBrackets,
        hotStreak: streaks.hotStreak,
        coldStreak: streaks.coldStreak,
        bestSport: bestPerformers.bestSport,
        bestPlatform: bestPerformers.bestPlatform,
        avgBetSize: avgBetSize.toString(),
      };

      await this.storage.createAnalyticsSnapshot(snapshot);
      console.log(`Analytics snapshot created for user ${userId}`);
    } catch (error) {
      console.error("Error generating analytics snapshot:", error);
      throw error;
    }
  }

  private calculatePlatformStats(bets: (Bet & { prop?: Prop; slip?: Slip })[]): any {
    const statsByPlatform: Record<string, PlatformPerformance> = {};

    for (const bet of bets) {
      const platform = bet.prop?.platform || bet.slip?.platform || 'Unknown';
      
      if (!statsByPlatform[platform]) {
        statsByPlatform[platform] = {
          platform,
          wins: 0,
          losses: 0,
          pushes: 0,
          totalBets: 0,
          winRate: 0,
          roi: 0,
        };
      }

      const stats = statsByPlatform[platform];
      stats.totalBets++;

      if (bet.status === 'won') stats.wins++;
      else if (bet.status === 'lost') stats.losses++;
      else if (bet.status === 'pushed') stats.pushes++;
    }

    for (const stats of Object.values(statsByPlatform)) {
      stats.winRate = stats.totalBets > 0 
        ? parseFloat(((stats.wins / stats.totalBets) * 100).toFixed(2))
        : 0;
      
      const totalStaked = bets
        .filter(b => (b.prop?.platform || b.slip?.platform) === stats.platform)
        .reduce((sum, b) => sum + parseFloat(b.amount), 0);
      
      const totalReturned = bets
        .filter(b => (b.prop?.platform || b.slip?.platform) === stats.platform && b.status === 'won')
        .reduce((sum, b) => sum + parseFloat(b.potentialReturn), 0);
      
      stats.roi = totalStaked > 0 
        ? parseFloat((((totalReturned - totalStaked) / totalStaked) * 100).toFixed(2))
        : 0;
    }

    return statsByPlatform;
  }

  private calculateSportStats(bets: (Bet & { prop?: Prop; slip?: Slip })[]): any {
    const statsBySport: Record<string, SportPerformance> = {};

    for (const bet of bets) {
      const sport = bet.prop?.sport || this.getSportFromSlip(bet.slip) || 'Unknown';
      
      if (!statsBySport[sport]) {
        statsBySport[sport] = {
          sport,
          wins: 0,
          losses: 0,
          pushes: 0,
          totalBets: 0,
          winRate: 0,
          roi: 0,
          totalStaked: 0,
          totalReturned: 0,
        };
      }

      const stats = statsBySport[sport];
      stats.totalBets++;
      stats.totalStaked += parseFloat(bet.amount);

      if (bet.status === 'won') {
        stats.wins++;
        stats.totalReturned += parseFloat(bet.potentialReturn);
      } else if (bet.status === 'lost') {
        stats.losses++;
      } else if (bet.status === 'pushed') {
        stats.pushes++;
        stats.totalReturned += parseFloat(bet.amount);
      }
    }

    for (const stats of Object.values(statsBySport)) {
      stats.winRate = stats.totalBets > 0 
        ? parseFloat(((stats.wins / stats.totalBets) * 100).toFixed(2))
        : 0;
      
      stats.roi = stats.totalStaked > 0 
        ? parseFloat((((stats.totalReturned - stats.totalStaked) / stats.totalStaked) * 100).toFixed(2))
        : 0;
    }

    return statsBySport;
  }

  private calculateConfidenceBrackets(bets: (Bet & { prop?: Prop; slip?: Slip })[]): any {
    const brackets = [
      { min: 60, max: 70, name: '60-70%' },
      { min: 70, max: 80, name: '70-80%' },
      { min: 80, max: 90, name: '80-90%' },
      { min: 90, max: 100, name: '90-100%' },
    ];

    const bracketStats: Record<string, ConfidenceBracket & { predictedSum: number }> = {};

    for (const bracket of brackets) {
      bracketStats[bracket.name] = {
        bracket: bracket.name,
        predictedWinRate: 0,
        actualWinRate: 0,
        totalBets: 0,
        accuracy: 0,
        predictedSum: 0,
      };
    }

    for (const bet of bets) {
      const confidence = bet.prop?.confidence || bet.slip?.confidence || 0;
      
      const matchingBracket = brackets.find(b => confidence >= b.min && confidence < b.max);
      if (!matchingBracket) continue;

      const stats = bracketStats[matchingBracket.name];
      stats.totalBets++;
      stats.predictedSum += confidence;

      if (bet.status === 'won') {
        stats.actualWinRate++;
      }
    }

    const result: Record<string, ConfidenceBracket> = {};
    for (const [key, stats] of Object.entries(bracketStats)) {
      if (stats.totalBets > 0) {
        const predictedWinRate = stats.predictedSum / stats.totalBets;
        const actualWinRate = (stats.actualWinRate / stats.totalBets) * 100;
        const difference = Math.abs(actualWinRate - predictedWinRate);
        
        result[key] = {
          bracket: stats.bracket,
          predictedWinRate: parseFloat(predictedWinRate.toFixed(2)),
          actualWinRate: parseFloat(actualWinRate.toFixed(2)),
          totalBets: stats.totalBets,
          accuracy: Math.max(0, parseFloat((100 - difference).toFixed(2))),
        };
      } else {
        result[key] = {
          bracket: stats.bracket,
          predictedWinRate: 0,
          actualWinRate: 0,
          totalBets: 0,
          accuracy: 0,
        };
      }
    }

    return result;
  }

  private calculateStreaks(bets: (Bet & { prop?: Prop; slip?: Slip })[]): { hotStreak: number; coldStreak: number } {
    const sortedBets = [...bets].sort((a, b) => {
      const aDate = a.settledAt || a.createdAt;
      const bDate = b.settledAt || b.createdAt;
      return new Date(aDate).getTime() - new Date(bDate).getTime();
    });

    let currentHotStreak = 0;
    let maxHotStreak = 0;
    let currentColdStreak = 0;
    let maxColdStreak = 0;

    for (const bet of sortedBets) {
      if (bet.status === 'won') {
        currentHotStreak++;
        currentColdStreak = 0;
        maxHotStreak = Math.max(maxHotStreak, currentHotStreak);
      } else if (bet.status === 'lost') {
        currentColdStreak++;
        currentHotStreak = 0;
        maxColdStreak = Math.max(maxColdStreak, currentColdStreak);
      }
    }

    return {
      hotStreak: maxHotStreak,
      coldStreak: maxColdStreak,
    };
  }

  private findBestPerformers(sportStats: any, platformStats: any): { bestSport: string | null; bestPlatform: string | null } {
    let bestSport: string | null = null;
    let bestSportROI = -Infinity;

    for (const [sport, stats] of Object.entries(sportStats) as [string, SportPerformance][]) {
      if (stats.totalBets >= 5 && stats.roi > bestSportROI) {
        bestSportROI = stats.roi;
        bestSport = sport;
      }
    }

    let bestPlatform: string | null = null;
    let bestPlatformWinRate = 0;

    for (const [platform, stats] of Object.entries(platformStats) as [string, PlatformPerformance][]) {
      if (stats.totalBets >= 5 && stats.winRate > bestPlatformWinRate) {
        bestPlatformWinRate = stats.winRate;
        bestPlatform = platform;
      }
    }

    return { bestSport, bestPlatform };
  }

  private calculateAverageBetSize(bets: (Bet & { prop?: Prop; slip?: Slip })[]): number {
    if (bets.length === 0) return 0;
    
    const totalStaked = bets.reduce((sum, bet) => sum + parseFloat(bet.amount), 0);
    return parseFloat((totalStaked / bets.length).toFixed(2));
  }

  private getSportFromSlip(slip?: Slip): string | null {
    if (!slip || !slip.picks) return null;
    
    const picks = slip.picks as any[];
    if (picks.length > 0 && picks[0].sport) {
      return picks[0].sport;
    }
    
    return null;
  }

  async getLatestAnalytics(userId: string) {
    return await this.storage.getLatestAnalytics(userId);
  }

  async getAnalyticsHistory(userId: string, days: number = 30) {
    return await this.storage.getAnalyticsHistory(userId, days);
  }

  async getPlatformComparison(userId: string) {
    const latest = await this.storage.getLatestAnalytics(userId);
    if (!latest || !latest.platformStats) return [];

    return Object.values(latest.platformStats as any).sort((a: any, b: any) => b.winRate - a.winRate);
  }

  async getSportBreakdown(userId: string) {
    const latest = await this.storage.getLatestAnalytics(userId);
    if (!latest || !latest.sportStats) return [];

    return Object.values(latest.sportStats as any).sort((a: any, b: any) => b.roi - a.roi);
  }

  async getConfidenceAccuracy(userId: string) {
    const latest = await this.storage.getLatestAnalytics(userId);
    if (!latest || !latest.confidenceBrackets) return [];

    return Object.values(latest.confidenceBrackets as any);
  }
}
