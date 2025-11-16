import { scoreboardClient } from "../integrations/scoreboardClient";
import { storage } from "../storage";
import type { InsertGameEvent } from "@shared/schema";

export class LiveScoreboardService {
  /**
   * Get live scores for a sport
   */
  async getLiveScores(sport: string) {
    try {
      const games = await scoreboardClient.getScoresBySport(sport);
      
      // Store/update games in database
      for (const game of games) {
        const existing = await storage.getGameEvent(game.gameId);
        
        if (existing) {
          await storage.updateGameEvent(game.gameId, {
            homeScore: game.homeScore,
            awayScore: game.awayScore,
            status: game.status,
            playerStats: game.playerStats,
            updatedAt: new Date(),
          });
        } else {
          const gameEvent: InsertGameEvent = {
            sport: game.sport,
            gameId: game.gameId,
            homeTeam: game.homeTeam,
            awayTeam: game.awayTeam,
            gameTime: game.gameTime,
            status: game.status,
            homeScore: game.homeScore,
            awayScore: game.awayScore,
            playerStats: game.playerStats,
            updatedAt: new Date(),
          };
          
          await storage.createGameEvent(gameEvent);
        }
      }
      
      return games;
    } catch (error) {
      console.error(`[Scoreboard] Failed to fetch ${sport} scores:`, error);
      return [];
    }
  }

  /**
   * Get all live games across sports
   */
  async getAllLiveScores() {
    const [nba, nhl, nfl, mlb] = await Promise.all([
      this.getLiveScores('NBA'),
      this.getLiveScores('NHL'),
      this.getLiveScores('NFL'),
      this.getLiveScores('MLB'),
    ]);

    return {
      NBA: nba,
      NHL: nhl,
      NFL: nfl,
      MLB: mlb,
    };
  }

  /**
   * Get games in progress
   */
  async getInProgressGames(sport?: string) {
    const allGames = await storage.getPendingGames(sport);
    return allGames.filter(g => g.status === 'in_progress');
  }

  /**
   * Check for completed games and return them for settlement
   */
  async getCompletedGames(sport?: string) {
    const allGames = await storage.getPendingGames(sport);
    return allGames.filter(g => g.status === 'final');
  }
}

export const liveScoreboardService = new LiveScoreboardService();
