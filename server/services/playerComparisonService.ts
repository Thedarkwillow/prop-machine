import { balldontlieClient } from "../integrations/balldontlieClient";

interface PlayerComparison {
  player1: {
    id: number;
    name: string;
    team: string;
    stats: {
      ppg: number;
      rpg: number;
      apg: number;
      fg_pct: number;
      gamesPlayed: number;
    };
    recentGames: any[];
  };
  player2: {
    id: number;
    name: string;
    team: string;
    stats: {
      ppg: number;
      rpg: number;
      apg: number;
      fg_pct: number;
      gamesPlayed: number;
    };
    recentGames: any[];
  };
  comparison: {
    ppgDiff: number;
    rpgDiff: number;
    apgDiff: number;
    betterScorer: string;
    betterRebounder: string;
    betterPlaymaker: string;
  };
}

export class PlayerComparisonService {
  /**
   * Compare two NBA players stats
   */
  async comparePlayers(playerName1: string, playerName2: string): Promise<PlayerComparison> {
    // Search for both players
    const [search1, search2] = await Promise.all([
      balldontlieClient.searchPlayers(playerName1),
      balldontlieClient.searchPlayers(playerName2),
    ]);

    if (!search1.data[0] || !search2.data[0]) {
      throw new Error('One or both players not found');
    }

    const player1 = search1.data[0];
    const player2 = search2.data[0];

    // Get season stats for both
    const currentSeason = new Date().getMonth() < 6 
      ? new Date().getFullYear() - 1 
      : new Date().getFullYear();

    const [stats1Response, stats2Response] = await Promise.all([
      balldontlieClient.getRecentPlayerStats(player1.id, 10),
      balldontlieClient.getRecentPlayerStats(player2.id, 10),
    ]);

    // Calculate averages
    const stats1 = balldontlieClient.calculatePlayerAverages(stats1Response);
    const stats2 = balldontlieClient.calculatePlayerAverages(stats2Response);

    return {
      player1: {
        id: player1.id,
        name: `${player1.first_name} ${player1.last_name}`,
        team: player1.team.full_name,
        stats: stats1,
        recentGames: stats1Response.data.slice(0, 5),
      },
      player2: {
        id: player2.id,
        name: `${player2.first_name} ${player2.last_name}`,
        team: player2.team.full_name,
        stats: stats2,
        recentGames: stats2Response.data.slice(0, 5),
      },
      comparison: {
        ppgDiff: stats1.ppg - stats2.ppg,
        rpgDiff: stats1.rpg - stats2.rpg,
        apgDiff: stats1.apg - stats2.apg,
        betterScorer: stats1.ppg > stats2.ppg ? 'player1' : 'player2',
        betterRebounder: stats1.rpg > stats2.rpg ? 'player1' : 'player2',
        betterPlaymaker: stats1.apg > stats2.apg ? 'player1' : 'player2',
      },
    };
  }

  /**
   * Get detailed player stats
   */
  async getPlayerDetails(playerName: string) {
    const searchResult = await balldontlieClient.searchPlayers(playerName);
    
    if (!searchResult.data[0]) {
      throw new Error('Player not found');
    }

    const player = searchResult.data[0];
    const statsResponse = await balldontlieClient.getRecentPlayerStats(player.id, 10);
    const averages = balldontlieClient.calculatePlayerAverages(statsResponse);

    return {
      id: player.id,
      name: `${player.first_name} ${player.last_name}`,
      team: player.team.full_name,
      position: player.position,
      averages,
      recentGames: statsResponse.data,
    };
  }
}

export const playerComparisonService = new PlayerComparisonService();
