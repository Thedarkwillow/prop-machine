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

class ESPNPlayerClient extends IntegrationClient {
  constructor() {
    super("https://sports.core.api.espn.com/v2/sports", ESPN_PLAYER_RATE_LIMIT);
  }

  /**
   * Search for NFL players by name
   */
  async searchNFLPlayers(searchTerm: string): Promise<any[]> {
    try {
      const response = await this.get<any>(
        `/football/leagues/nfl/athletes?limit=100`
      );
      
      if (!response?.data?.items) return [];
      
      // Filter by search term
      const players = [];
      for (const item of response.data.items.slice(0, 20)) {
        try {
          const playerData = await this.get<any>(item.$ref.replace(this.baseUrl, ""));
          if (playerData?.data?.fullName?.toLowerCase().includes(searchTerm.toLowerCase())) {
            players.push(playerData.data);
          }
        } catch (e) {
          continue;
        }
      }
      
      return players;
    } catch (error) {
      console.error("Error searching NFL players:", error);
      return [];
    }
  }

  /**
   * Search for NHL players by name
   */
  async searchNHLPlayers(searchTerm: string): Promise<any[]> {
    try {
      const response = await this.get<any>(
        `/hockey/leagues/nhl/athletes?limit=100`
      );
      
      if (!response?.data?.items) return [];
      
      // Filter by search term
      const players = [];
      for (const item of response.data.items.slice(0, 20)) {
        try {
          const playerData = await this.get<any>(item.$ref.replace(this.baseUrl, ""));
          if (playerData?.data?.fullName?.toLowerCase().includes(searchTerm.toLowerCase())) {
            players.push(playerData.data);
          }
        } catch (e) {
          continue;
        }
      }
      
      return players;
    } catch (error) {
      console.error("Error searching NHL players:", error);
      return [];
    }
  }

  /**
   * Get NFL player season stats
   */
  async getNFLPlayerStats(playerId: string): Promise<NFLPlayerStats> {
    try {
      const statsUrl = `/football/leagues/nfl/seasons/2024/athletes/${playerId}/statistics/0`;
      const response = await this.get<any>(statsUrl);
      
      const stats = response?.data?.splits?.categories || [];
      const passingStats = stats.find((c: any) => c.name === 'passing')?.stats || [];
      const rushingStats = stats.find((c: any) => c.name === 'rushing')?.stats || [];
      const receivingStats = stats.find((c: any) => c.name === 'receiving')?.stats || [];
      
      return {
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
    } catch (error) {
      console.error("Error fetching NFL player stats:", error);
      return { gamesPlayed: 0 };
    }
  }

  /**
   * Get NHL player season stats
   */
  async getNHLPlayerStats(playerId: string): Promise<NHLPlayerStats> {
    try {
      const statsUrl = `/hockey/leagues/nhl/seasons/2025/athletes/${playerId}/statistics/0`;
      const response = await this.get<any>(statsUrl);
      
      const stats = response?.data?.splits?.categories?.[0]?.stats || [];
      
      return {
        goals: stats.find((s: any) => s.name === 'goals')?.value || 0,
        assists: stats.find((s: any) => s.name === 'assists')?.value || 0,
        points: stats.find((s: any) => s.name === 'points')?.value || 0,
        plus_minus: stats.find((s: any) => s.name === 'plusMinus')?.value || 0,
        penalty_minutes: stats.find((s: any) => s.name === 'penaltyMinutes')?.value || 0,
        shots: stats.find((s: any) => s.name === 'shots')?.value || 0,
        gamesPlayed: stats.find((s: any) => s.name === 'gamesPlayed')?.value || 0,
      };
    } catch (error) {
      console.error("Error fetching NHL player stats:", error);
      return { gamesPlayed: 0 };
    }
  }
}

export const espnPlayerClient = new ESPNPlayerClient();
