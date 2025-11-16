import { IntegrationClient } from "./integrationClient";

interface PlayerStatsResponse {
  data: Array<{
    id: number;
    player: {
      id: number;
      first_name: string;
      last_name: string;
      position: string;
      team: {
        id: number;
        abbreviation: string;
        name: string;
      };
    };
    game: {
      id: number;
      date: string;
      home_team_id: number;
      visitor_team_id: number;
      home_team_score: number;
      visitor_team_score: number;
      status: string;
    };
    min: string;
    pts: number;
    reb: number;
    ast: number;
    stl: number;
    blk: number;
    fgm: number;
    fga: number;
    fg_pct: number;
    fg3m: number;
    fg3a: number;
    fg3_pct: number;
    ftm: number;
    fta: number;
    ft_pct: number;
    turnover: number;
  }>;
  meta: {
    total_pages: number;
    current_page: number;
    next_page: number | null;
    per_page: number;
    total_count: number;
  };
}

interface Game {
  id: number;
  date: string;
  home_team: {
    id: number;
    abbreviation: string;
    name: string;
  };
  visitor_team: {
    id: number;
    abbreviation: string;
    name: string;
  };
  home_team_score: number;
  visitor_team_score: number;
  status: string;
  time: string;
}

interface GamesResponse {
  data: Game[];
  meta: {
    total_pages: number;
    current_page: number;
    next_page: number | null;
    per_page: number;
    total_count: number;
  };
}

export class BalldontlieClient extends IntegrationClient {
  constructor() {
    super(
      'https://api.balldontlie.io/v1',
      {
        provider: 'balldontlie',
        requestsPerMinute: 60,
        requestsPerHour: 3600,
        requestsPerDay: 86400,
      },
      { ttl: 300, useETag: true, useLastModified: true }
    );
  }

  async getPlayerStats(playerId: number, season: number): Promise<PlayerStatsResponse> {
    const response = await this.get<PlayerStatsResponse>(
      `/stats?player_ids[]=${playerId}&seasons[]=${season}&per_page=100`
    );
    return response.data;
  }

  async getRecentPlayerStats(playerId: number, games: number = 10): Promise<PlayerStatsResponse> {
    const currentSeason = new Date().getMonth() < 6 ? new Date().getFullYear() - 1 : new Date().getFullYear();
    const response = await this.get<PlayerStatsResponse>(
      `/stats?player_ids[]=${playerId}&seasons[]=${currentSeason}&per_page=${games}`
    );
    return response.data;
  }

  async getTodaysGames(): Promise<GamesResponse> {
    const today = new Date().toISOString().split('T')[0];
    const response = await this.get<GamesResponse>(
      `/games?dates[]=${today}&per_page=100`
    );
    return response.data;
  }

  async getGamesByDate(date: string): Promise<GamesResponse> {
    const response = await this.get<GamesResponse>(
      `/games?dates[]=${date}&per_page=100`
    );
    return response.data;
  }

  async getGame(gameId: number): Promise<Game> {
    const response = await this.get<Game>(`/games/${gameId}`);
    return response.data;
  }

  calculatePlayerAverages(stats: PlayerStatsResponse): {
    ppg: number;
    rpg: number;
    apg: number;
    fg_pct: number;
    fg3_pct: number;
    ft_pct: number;
    gamesPlayed: number;
  } {
    const games = stats.data;
    const total = games.reduce((acc, game) => ({
      pts: acc.pts + game.pts,
      reb: acc.reb + game.reb,
      ast: acc.ast + game.ast,
      fgm: acc.fgm + game.fgm,
      fga: acc.fga + game.fga,
      fg3m: acc.fg3m + game.fg3m,
      fg3a: acc.fg3a + game.fg3a,
      ftm: acc.ftm + game.ftm,
      fta: acc.fta + game.fta,
    }), {
      pts: 0, reb: 0, ast: 0, fgm: 0, fga: 0, fg3m: 0, fg3a: 0, ftm: 0, fta: 0
    });

    const gamesPlayed = games.length;
    
    return {
      ppg: gamesPlayed > 0 ? total.pts / gamesPlayed : 0,
      rpg: gamesPlayed > 0 ? total.reb / gamesPlayed : 0,
      apg: gamesPlayed > 0 ? total.ast / gamesPlayed : 0,
      fg_pct: total.fga > 0 ? (total.fgm / total.fga) * 100 : 0,
      fg3_pct: total.fg3a > 0 ? (total.fg3m / total.fg3a) * 100 : 0,
      ft_pct: total.fta > 0 ? (total.ftm / total.fta) * 100 : 0,
      gamesPlayed,
    };
  }
}

export const balldontlieClient = new BalldontlieClient();
