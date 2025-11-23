import { IntegrationClient, RateLimitConfig } from "./integrationClient";

const ESPN_PLAYER_RATE_LIMIT: RateLimitConfig = {
  provider: "espn_players",
  requestsPerMinute: 30,
  requestsPerHour: 1000,
  requestsPerDay: 5000,
};

interface ESPNPlayer {
  id: string;
  fullName: string;
  displayName: string;
  shortName: string;
  position: {
    abbreviation: string;
  };
  team: {
    name: string;
    abbreviation: string;
  };
}

interface NFLPlayerStats {
  passing_yards?: number;
  passing_touchdowns?: number;
  rushing_yards?: number;
  rushing_touchdowns?: number;
  receiving_yards?: number;
  receiving_touchdowns?: number;
  receptions?: number;
  gamesPlayed: number;
}

interface NHLPlayerStats {
  goals?: number;
  assists?: number;
  points?: number;
  plus_minus?: number;
  penalty_minutes?: number;
  shots?: number;
  gamesPlayed: number;
}

interface NBAPlayerStats {
  points?: number;
  rebounds?: number;
  assists?: number;
  steals?: number;
  blocks?: number;
  threePointFieldGoalsMade?: number;
  threePointFieldGoalsAttempted?: number;
  fieldGoalsMade?: number;
  fieldGoalsAttempted?: number;
  freeThrowsMade?: number;
  freeThrowsAttempted?: number;
  twoPointFieldGoalsMade?: number;
  twoPointFieldGoalsAttempted?: number;
  turnovers?: number;
  personalFouls?: number;
  gamesPlayed: number;
}

class ESPNPlayerClient extends IntegrationClient {
  constructor() {
    super("https://sports.core.api.espn.com", ESPN_PLAYER_RATE_LIMIT);
  }

  /**
   * Search for NFL players by name using v3 athletes endpoint with full data
   */
  async searchNFLPlayers(searchTerm: string): Promise<any[]> {
    try {
      const searchLower = searchTerm.toLowerCase();
      const searchStartTime = Date.now();
      console.log(`[ESPN] ========================================`);
      console.log(`[ESPN] Searching NFL players: "${searchTerm}"`);
      console.log(`[ESPN] Timestamp: ${new Date(searchStartTime).toISOString()}`);
      
      const response = await this.get<any>(`/v3/sports/football/nfl/athletes?limit=5000`);
      const searchDuration = Date.now() - searchStartTime;
      
      const cacheStatus = response.cached ? '✅ CACHED' : '🔄 FRESH';
      const playerCount = response?.data?.items?.length || 0;
      console.log(`[ESPN] NFL player search result: ${cacheStatus}`);
      console.log(`[ESPN] Duration: ${searchDuration}ms`);
      console.log(`[ESPN] Total players in response: ${playerCount}`);
      
      if (!response?.data?.items) {
        console.log(`[ESPN] ❌ No items in response`);
        console.log(`[ESPN] ========================================`);
        return [];
      }
      
      // Pre-filter by name using data already in items (no additional API calls needed!)
      const rawMatches = response.data.items.filter((player: any) => {
        const fullName = player.fullName?.toLowerCase() || "";
        const displayName = player.displayName?.toLowerCase() || "";
        return fullName.includes(searchLower) || displayName.includes(searchLower);
      });
      
      console.log(`[ESPN] Matched ${rawMatches.length} players for "${searchTerm}"`);
      console.log(`[ESPN] ========================================`);
      
      // Ensure consistent structure for downstream use
      return rawMatches.slice(0, 10).map((player: any) => ({
        id: player.id,
        fullName: player.fullName,
        displayName: player.displayName,
        shortName: player.shortName,
        team: { name: player.team?.name || player.team?.displayName || "Unknown" },
        position: player.position,
      }));
    } catch (error) {
      console.error("[ESPN] ❌ Error searching NFL players:", error);
      console.error(`[ESPN] Error details:`, error instanceof Error ? error.message : String(error));
      console.error(`[ESPN] ========================================`);
      return [];
    }
  }

  /**
   * Search for NHL players by name using v3 athletes endpoint with full data
   */
  async searchNHLPlayers(searchTerm: string): Promise<any[]> {
    try {
      const searchLower = searchTerm.toLowerCase();
      const searchStartTime = Date.now();
      console.log(`[ESPN] ========================================`);
      console.log(`[ESPN] Searching NHL players: "${searchTerm}"`);
      console.log(`[ESPN] Timestamp: ${new Date(searchStartTime).toISOString()}`);
      
      const response = await this.get<any>(`/v3/sports/hockey/nhl/athletes?limit=2000`);
      const searchDuration = Date.now() - searchStartTime;
      
      const cacheStatus = response.cached ? '✅ CACHED' : '🔄 FRESH';
      const playerCount = response?.data?.items?.length || 0;
      console.log(`[ESPN] NHL player search result: ${cacheStatus}`);
      console.log(`[ESPN] Duration: ${searchDuration}ms`);
      console.log(`[ESPN] Total players in response: ${playerCount}`);
      
      if (!response?.data?.items) {
        console.log(`[ESPN] ❌ No items in response`);
        console.log(`[ESPN] ========================================`);
        return [];
      }
      
      // Pre-filter by name using data already in items (no additional API calls needed!)
      const rawMatches = response.data.items.filter((player: any) => {
        const fullName = player.fullName?.toLowerCase() || "";
        const displayName = player.displayName?.toLowerCase() || "";
        return fullName.includes(searchLower) || displayName.includes(searchLower);
      });
      
      console.log(`[ESPN] Matched ${rawMatches.length} players for "${searchTerm}"`);
      console.log(`[ESPN] ========================================`);
      
      // Ensure consistent structure for downstream use
      return rawMatches.slice(0, 10).map((player: any) => ({
        id: player.id,
        fullName: player.fullName,
        displayName: player.displayName,
        shortName: player.shortName,
        team: { name: player.team?.name || player.team?.displayName || "Unknown" },
        position: player.position,
      }));
    } catch (error) {
      console.error("[ESPN] ❌ Error searching NHL players:", error);
      console.error(`[ESPN] Error details:`, error instanceof Error ? error.message : String(error));
      console.error(`[ESPN] ========================================`);
      return [];
    }
  }

  /**
   * Get NFL player season stats
   */
  async getNFLPlayerStats(playerId: string): Promise<NFLPlayerStats> {
    try {
      const statsStartTime = Date.now();
      const statsUrl = `/v2/sports/football/leagues/nfl/seasons/2024/athletes/${playerId}/statistics/0`;
      console.log(`[ESPN] ========================================`);
      console.log(`[ESPN] Fetching NFL stats for player ${playerId}`);
      console.log(`[ESPN] URL: ${statsUrl}`);
      console.log(`[ESPN] Timestamp: ${new Date(statsStartTime).toISOString()}`);
      
      const response = await this.get<any>(statsUrl);
      const statsDuration = Date.now() - statsStartTime;
      
      const cacheStatus = response.cached ? '✅ CACHED' : '🔄 FRESH';
      const hasData = !!response?.data;
      const categoryCount = response?.data?.splits?.categories?.length || 0;
      console.log(`[ESPN] NFL stats response: ${cacheStatus}`);
      console.log(`[ESPN] Duration: ${statsDuration}ms`);
      console.log(`[ESPN] Has data: ${hasData}, Categories: ${categoryCount}`);
      
      const stats = response?.data?.splits?.categories || [];
      const passingStats = stats.find((c: any) => c.name === 'passing')?.stats || [];
      const rushingStats = stats.find((c: any) => c.name === 'rushing')?.stats || [];
      const receivingStats = stats.find((c: any) => c.name === 'receiving')?.stats || [];
      
      const result = {
        passing_yards: passingStats.find((s: any) => s.name === 'passingYards')?.value || 0,
        passing_touchdowns: passingStats.find((s: any) => s.name === 'passingTouchdowns')?.value || 0,
        rushing_yards: rushingStats.find((s: any) => s.name === 'rushingYards')?.value || 0,
        rushing_touchdowns: rushingStats.find((s: any) => s.name === 'rushingTouchdowns')?.value || 0,
        receiving_yards: receivingStats.find((s: any) => s.name === 'receivingYards')?.value || 0,
        receiving_touchdowns: receivingStats.find((s: any) => s.name === 'receivingTouchdowns')?.value || 0,
        receptions: receivingStats.find((s: any) => s.name === 'receptions')?.value || 0,
        gamesPlayed: passingStats.find((s: any) => s.name === 'gamesPlayed')?.value || 
                     rushingStats.find((s: any) => s.name === 'gamesPlayed')?.value || 
                     receivingStats.find((s: any) => s.name === 'gamesPlayed')?.value || 0,
      };
      
      console.log(`[ESPN] ✅ NFL stats retrieved: Games=${result.gamesPlayed}, PassYds=${result.passing_yards}, RushYds=${result.rushing_yards}, RecYds=${result.receiving_yards}`);
      console.log(`[ESPN] ========================================`);
      
      return result;
    } catch (error) {
      console.error("[ESPN] ❌ Error fetching NFL player stats:", error);
      console.error(`[ESPN] Error details:`, error instanceof Error ? error.message : String(error));
      console.error(`[ESPN] ========================================`);
      return { gamesPlayed: 0 };
    }
  }

  /**
   * Get NHL player season stats
   */
  async getNHLPlayerStats(playerId: string): Promise<NHLPlayerStats> {
    try {
      const statsStartTime = Date.now();
      const statsUrl = `/v2/sports/hockey/leagues/nhl/seasons/2025/athletes/${playerId}/statistics/0`;
      console.log(`[ESPN] ========================================`);
      console.log(`[ESPN] Fetching NHL stats for player ${playerId}`);
      console.log(`[ESPN] URL: ${statsUrl}`);
      console.log(`[ESPN] Timestamp: ${new Date(statsStartTime).toISOString()}`);
      
      const response = await this.get<any>(statsUrl);
      const statsDuration = Date.now() - statsStartTime;
      
      const cacheStatus = response.cached ? '✅ CACHED' : '🔄 FRESH';
      const hasData = !!response?.data;
      const categoryCount = response?.data?.splits?.categories?.length || 0;
      console.log(`[ESPN] NHL stats response: ${cacheStatus}`);
      console.log(`[ESPN] Duration: ${statsDuration}ms`);
      console.log(`[ESPN] Has data: ${hasData}, Categories: ${categoryCount}`);
      
      const stats = response?.data?.splits?.categories?.[0]?.stats || [];
      
      const result = {
        goals: stats.find((s: any) => s.name === 'goals')?.value || 0,
        assists: stats.find((s: any) => s.name === 'assists')?.value || 0,
        points: stats.find((s: any) => s.name === 'points')?.value || 0,
        plus_minus: stats.find((s: any) => s.name === 'plusMinus')?.value || 0,
        penalty_minutes: stats.find((s: any) => s.name === 'penaltyMinutes')?.value || 0,
        shots: stats.find((s: any) => s.name === 'shots')?.value || 0,
        gamesPlayed: stats.find((s: any) => s.name === 'gamesPlayed')?.value || 0,
      };
      
      console.log(`[ESPN] ✅ NHL stats retrieved: Games=${result.gamesPlayed}, Goals=${result.goals}, Assists=${result.assists}, Points=${result.points}`);
      console.log(`[ESPN] ========================================`);
      
      return result;
    } catch (error) {
      console.error("[ESPN] ❌ Error fetching NHL player stats:", error);
      console.error(`[ESPN] Error details:`, error instanceof Error ? error.message : String(error));
      console.error(`[ESPN] ========================================`);
      return { gamesPlayed: 0 };
    }
  }

  /**
   * Search for NBA players by name using v3 athletes endpoint with full data
   */
  async searchNBAPlayers(searchTerm: string): Promise<any[]> {
    try {
      const searchLower = searchTerm.toLowerCase();
      const searchStartTime = Date.now();
      console.log(`[ESPN] ========================================`);
      console.log(`[ESPN] Searching NBA players: "${searchTerm}"`);
      console.log(`[ESPN] Timestamp: ${new Date(searchStartTime).toISOString()}`);
      
      const response = await this.get<any>(`/v3/sports/basketball/nba/athletes?limit=2000`);
      const searchDuration = Date.now() - searchStartTime;
      
      const cacheStatus = response.cached ? '✅ CACHED' : '🔄 FRESH';
      const playerCount = response?.data?.items?.length || 0;
      console.log(`[ESPN] NBA player search result: ${cacheStatus}`);
      console.log(`[ESPN] Duration: ${searchDuration}ms`);
      console.log(`[ESPN] Total players in response: ${playerCount}`);
      
      if (!response?.data?.items) {
        console.log(`[ESPN] ❌ No items in response`);
        console.log(`[ESPN] ========================================`);
        return [];
      }
      
      // Pre-filter by name using data already in items (no additional API calls needed!)
      const rawMatches = response.data.items.filter((player: any) => {
        const fullName = player.fullName?.toLowerCase() || "";
        const displayName = player.displayName?.toLowerCase() || "";
        return fullName.includes(searchLower) || displayName.includes(searchLower);
      });
      
      console.log(`[ESPN] Matched ${rawMatches.length} players for "${searchTerm}"`);
      console.log(`[ESPN] ========================================`);
      
      // Ensure consistent structure for downstream use
      return rawMatches.slice(0, 10).map((player: any) => ({
        id: player.id,
        fullName: player.fullName,
        displayName: player.displayName,
        shortName: player.shortName,
        team: { name: player.team?.name || player.team?.displayName || "Unknown" },
        position: player.position,
      }));
    } catch (error) {
      console.error("[ESPN] ❌ Error searching NBA players:", error);
      console.error(`[ESPN] Error details:`, error instanceof Error ? error.message : String(error));
      console.error(`[ESPN] ========================================`);
      return [];
    }
  }

  /**
   * Get NBA player season stats
   */
  async getNBAPlayerStats(playerId: string): Promise<NBAPlayerStats> {
    try {
      const statsStartTime = Date.now();
      // NBA uses a different endpoint structure than NHL/NFL
      const statsUrl = `/v2/sports/basketball/leagues/nba/athletes/${playerId}/statistics`;
      console.log(`[ESPN] ========================================`);
      console.log(`[ESPN] Fetching NBA stats for player ${playerId}`);
      console.log(`[ESPN] URL: ${statsUrl}`);
      console.log(`[ESPN] Timestamp: ${new Date(statsStartTime).toISOString()}`);
      
      const response = await this.get<any>(statsUrl);
      const statsDuration = Date.now() - statsStartTime;
      
      const cacheStatus = response.cached ? '✅ CACHED' : '🔄 FRESH';
      const hasData = !!response?.data;
      console.log(`[ESPN] NBA stats response: ${cacheStatus}`);
      console.log(`[ESPN] Duration: ${statsDuration}ms`);
      console.log(`[ESPN] Has data: ${hasData}`);
      
      // ESPN NBA stats are split across multiple categories: defensive, general, offensive
      const categories = response?.data?.splits?.categories || [];
      console.log(`[ESPN] Categories found: ${categories.length}`);
      
      // Combine all stats from all categories for easier searching
      const allStats: any[] = [];
      categories.forEach((category: any) => {
        if (category.stats) {
          allStats.push(...category.stats);
        }
      });
      console.log(`[ESPN] Total stats entries: ${allStats.length}`);
      
      // Helper to find stat value by multiple possible names
      const findStat = (names: string[]): number => {
        for (const name of names) {
          const stat = allStats.find((s: any) => s.name === name);
          if (stat && stat.value != null) return parseFloat(stat.value);
        }
        return 0;
      };
      
      const stats = {
        points: findStat(['avgPoints', 'points', 'ppg', 'pointsPerGame']),
        rebounds: findStat(['avgRebounds', 'rebounds', 'rpg', 'reboundsPerGame']),
        assists: findStat(['avgAssists', 'assists', 'apg', 'assistsPerGame']),
        steals: findStat(['avgSteals', 'steals', 'spg', 'stealsPerGame']),
        blocks: findStat(['avgBlocks', 'blocks', 'bpg', 'blocksPerGame']),
        threePointFieldGoalsMade: findStat(['avgThreePointFieldGoalsMade', 'threePointFieldGoalsMade', '3ptm', 'threePointersMade']),
        threePointFieldGoalsAttempted: findStat(['avgThreePointFieldGoalsAttempted', 'threePointFieldGoalsAttempted', '3pta', 'threePointersAttempted']),
        fieldGoalsMade: findStat(['avgFieldGoalsMade', 'fieldGoalsMade', 'fgm']),
        fieldGoalsAttempted: findStat(['avgFieldGoalsAttempted', 'fieldGoalsAttempted', 'fga']),
        freeThrowsMade: findStat(['avgFreeThrowsMade', 'freeThrowsMade', 'ftm']),
        freeThrowsAttempted: findStat(['avgFreeThrowsAttempted', 'freeThrowsAttempted', 'fta']),
        twoPointFieldGoalsMade: findStat(['avgTwoPointFieldGoalsMade', 'twoPointFieldGoalsMade']),
        twoPointFieldGoalsAttempted: findStat(['avgTwoPointFieldGoalsAttempted', 'twoPointFieldGoalsAttempted']),
        turnovers: findStat(['avgTurnovers', 'turnovers', 'tpg', 'turnoversPerGame']),
        personalFouls: findStat(['avgPersonalFouls', 'personalFouls', 'fpg', 'foulsPerGame']),
        gamesPlayed: findStat(['gamesPlayed', 'games', 'gp']),
      };
      
      console.log(`[ESPN] ✅ NBA stats retrieved: Games=${stats.gamesPlayed}, PTS=${stats.points}, REB=${stats.rebounds}, AST=${stats.assists}`);
      console.log(`[ESPN] ========================================`);
      
      return stats;
    } catch (error) {
      console.error("[ESPN] ❌ Error fetching NBA player stats:", error);
      console.error(`[ESPN] Error details:`, error instanceof Error ? error.message : String(error));
      console.error(`[ESPN] ========================================`);
      return { gamesPlayed: 0 };
    }
  }
}

export const espnPlayerClient = new ESPNPlayerClient();
