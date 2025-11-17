import { balldontlieClient } from "../integrations/balldontlieClient";
import { espnPlayerClient } from "../integrations/espnPlayerClient";

interface BasePlayerInfo {
  id: string | number;
  name: string;
  team: string;
  sport: string;
}

interface NBAPlayerComparison {
  sport: "NBA";
  player1: BasePlayerInfo & {
    stats: {
      ppg: number;
      rpg: number;
      apg: number;
      fg_pct: number;
      gamesPlayed: number;
    };
    recentGames: any[];
  };
  player2: BasePlayerInfo & {
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

interface NHLPlayerComparison {
  sport: "NHL";
  player1: BasePlayerInfo & {
    stats: {
      goals: number;
      assists: number;
      points: number;
      plusMinus: number;
      gamesPlayed: number;
    };
  };
  player2: BasePlayerInfo & {
    stats: {
      goals: number;
      assists: number;
      points: number;
      plusMinus: number;
      gamesPlayed: number;
    };
  };
  comparison: {
    goalsDiff: number;
    assistsDiff: number;
    pointsDiff: number;
    betterScorer: string;
    betterPlaymaker: string;
  };
}

interface NFLPlayerComparison {
  sport: "NFL";
  player1: BasePlayerInfo & {
    stats: {
      passingYards?: number;
      passingTDs?: number;
      rushingYards?: number;
      rushingTDs?: number;
      receivingYards?: number;
      receivingTDs?: number;
      receptions?: number;
      gamesPlayed: number;
    };
  };
  player2: BasePlayerInfo & {
    stats: {
      passingYards?: number;
      passingTDs?: number;
      rushingYards?: number;
      rushingTDs?: number;
      receivingYards?: number;
      receivingTDs?: number;
      receptions?: number;
      gamesPlayed: number;
    };
  };
  comparison: {
    betterPasser?: string;
    betterRusher?: string;
    betterReceiver?: string;
  };
}

type PlayerComparison = NBAPlayerComparison | NHLPlayerComparison | NFLPlayerComparison;

export class PlayerComparisonService {
  /**
   * Compare two players stats (multi-sport)
   */
  async comparePlayers(playerName1: string, playerName2: string, sport: "NBA" | "NHL" | "NFL" = "NBA"): Promise<PlayerComparison> {
    switch (sport) {
      case "NBA":
        return this.compareNBAPlayers(playerName1, playerName2);
      case "NHL":
        return this.compareNHLPlayers(playerName1, playerName2);
      case "NFL":
        return this.compareNFLPlayers(playerName1, playerName2);
      default:
        throw new Error(`Unsupported sport: ${sport}`);
    }
  }

  /**
   * Compare two NBA players stats
   */
  private async compareNBAPlayers(playerName1: string, playerName2: string): Promise<NBAPlayerComparison> {
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
      sport: "NBA",
      player1: {
        id: player1.id,
        name: `${player1.first_name} ${player1.last_name}`,
        team: player1.team.full_name,
        sport: "NBA",
        stats: stats1,
        recentGames: stats1Response.data.slice(0, 5),
      },
      player2: {
        id: player2.id,
        name: `${player2.first_name} ${player2.last_name}`,
        team: player2.team.full_name,
        sport: "NBA",
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
   * Compare two NHL players stats
   */
  private async compareNHLPlayers(playerName1: string, playerName2: string): Promise<NHLPlayerComparison> {
    const [players1, players2] = await Promise.all([
      espnPlayerClient.searchNHLPlayers(playerName1),
      espnPlayerClient.searchNHLPlayers(playerName2),
    ]);

    if (!players1[0] || !players2[0]) {
      throw new Error('One or both players not found');
    }

    const player1 = players1[0];
    const player2 = players2[0];

    const [stats1, stats2] = await Promise.all([
      espnPlayerClient.getNHLPlayerStats(player1.id),
      espnPlayerClient.getNHLPlayerStats(player2.id),
    ]);

    return {
      sport: "NHL",
      player1: {
        id: player1.id,
        name: player1.fullName || player1.displayName,
        team: player1.team?.name || "Unknown",
        sport: "NHL",
        stats: {
          goals: stats1.goals || 0,
          assists: stats1.assists || 0,
          points: stats1.points || 0,
          plusMinus: stats1.plus_minus || 0,
          gamesPlayed: stats1.gamesPlayed,
        },
      },
      player2: {
        id: player2.id,
        name: player2.fullName || player2.displayName,
        team: player2.team?.name || "Unknown",
        sport: "NHL",
        stats: {
          goals: stats2.goals || 0,
          assists: stats2.assists || 0,
          points: stats2.points || 0,
          plusMinus: stats2.plus_minus || 0,
          gamesPlayed: stats2.gamesPlayed,
        },
      },
      comparison: {
        goalsDiff: (stats1.goals || 0) - (stats2.goals || 0),
        assistsDiff: (stats1.assists || 0) - (stats2.assists || 0),
        pointsDiff: (stats1.points || 0) - (stats2.points || 0),
        betterScorer: (stats1.goals || 0) > (stats2.goals || 0) ? 'player1' : 'player2',
        betterPlaymaker: (stats1.assists || 0) > (stats2.assists || 0) ? 'player1' : 'player2',
      },
    };
  }

  /**
   * Compare two NFL players stats
   */
  private async compareNFLPlayers(playerName1: string, playerName2: string): Promise<NFLPlayerComparison> {
    const [players1, players2] = await Promise.all([
      espnPlayerClient.searchNFLPlayers(playerName1),
      espnPlayerClient.searchNFLPlayers(playerName2),
    ]);

    if (!players1[0] || !players2[0]) {
      throw new Error('One or both players not found');
    }

    const player1 = players1[0];
    const player2 = players2[0];

    const [stats1, stats2] = await Promise.all([
      espnPlayerClient.getNFLPlayerStats(player1.id),
      espnPlayerClient.getNFLPlayerStats(player2.id),
    ]);

    const determineBetterPasser = () => {
      const yards1 = stats1.passing_yards || 0;
      const yards2 = stats2.passing_yards || 0;
      return yards1 > yards2 ? 'player1' : 'player2';
    };

    const determineBetterRusher = () => {
      const yards1 = stats1.rushing_yards || 0;
      const yards2 = stats2.rushing_yards || 0;
      return yards1 > yards2 ? 'player1' : 'player2';
    };

    const determineBetterReceiver = () => {
      const yards1 = stats1.receiving_yards || 0;
      const yards2 = stats2.receiving_yards || 0;
      return yards1 > yards2 ? 'player1' : 'player2';
    };

    return {
      sport: "NFL",
      player1: {
        id: player1.id,
        name: player1.fullName || player1.displayName,
        team: player1.team?.name || "Unknown",
        sport: "NFL",
        stats: {
          passingYards: stats1.passing_yards,
          passingTDs: stats1.passing_touchdowns,
          rushingYards: stats1.rushing_yards,
          rushingTDs: stats1.rushing_touchdowns,
          receivingYards: stats1.receiving_yards,
          receivingTDs: stats1.receiving_touchdowns,
          receptions: stats1.receptions,
          gamesPlayed: stats1.gamesPlayed,
        },
      },
      player2: {
        id: player2.id,
        name: player2.fullName || player2.displayName,
        team: player2.team?.name || "Unknown",
        sport: "NFL",
        stats: {
          passingYards: stats2.passing_yards,
          passingTDs: stats2.passing_touchdowns,
          rushingYards: stats2.rushing_yards,
          rushingTDs: stats2.rushing_touchdowns,
          receivingYards: stats2.receiving_yards,
          receivingTDs: stats2.receiving_touchdowns,
          receptions: stats2.receptions,
          gamesPlayed: stats2.gamesPlayed,
        },
      },
      comparison: {
        betterPasser: (stats1.passing_yards || 0) > 0 || (stats2.passing_yards || 0) > 0 ? determineBetterPasser() : undefined,
        betterRusher: (stats1.rushing_yards || 0) > 0 || (stats2.rushing_yards || 0) > 0 ? determineBetterRusher() : undefined,
        betterReceiver: (stats1.receiving_yards || 0) > 0 || (stats2.receiving_yards || 0) > 0 ? determineBetterReceiver() : undefined,
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
