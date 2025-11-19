import { IntegrationClient, RateLimitConfig } from "./integrationClient";
import { balldontlieClient } from "./balldontlieClient";

interface GameResult {
  gameId: string;
  sport: string;
  homeTeam: string;
  awayTeam: string;
  homeScore: number;
  awayScore: number;
  status: "scheduled" | "in_progress" | "final";
  gameTime: Date;
  playerStats: Record<string, Record<string, number>>;
}

const ESPN_RATE_LIMIT: RateLimitConfig = {
  provider: "espn_scoreboard",
  requestsPerMinute: 30,
  requestsPerHour: 1000,
  requestsPerDay: 5000,
};

class ScoreboardClient extends IntegrationClient {
  constructor() {
    super("https://site.api.espn.com/apis/site/v2/sports", ESPN_RATE_LIMIT);
  }

  async getNBAScores(date?: Date): Promise<GameResult[]> {
    try {
      const dateStr = date ? this.formatDate(date) : this.formatDate(new Date());
      const response = await this.get<any>(
        `/basketball/nba/scoreboard?dates=${dateStr}`
      );

      if (!response?.data?.events) return [];

      return response.data.events.map((event: any) => ({
        gameId: event.id,
        sport: "NBA",
        homeTeam: event.competitions[0]?.competitors?.find((c: any) => c.homeAway === "home")?.team?.displayName || "",
        awayTeam: event.competitions[0]?.competitors?.find((c: any) => c.homeAway === "away")?.team?.displayName || "",
        homeScore: parseInt(event.competitions[0]?.competitors?.find((c: any) => c.homeAway === "home")?.score || "0"),
        awayScore: parseInt(event.competitions[0]?.competitors?.find((c: any) => c.homeAway === "away")?.score || "0"),
        status: event.status?.type?.completed ? "final" : event.status?.type?.state === "in" ? "in_progress" : "scheduled",
        gameTime: new Date(event.date),
        playerStats: {},
      }));
    } catch (error) {
      console.error("Error fetching NBA scores:", error);
      return [];
    }
  }

  async getNHLScores(date?: Date): Promise<GameResult[]> {
    try {
      const dateStr = date ? this.formatDate(date) : this.formatDate(new Date());
      const response = await this.get<any>(
        `/hockey/nhl/scoreboard?dates=${dateStr}`
      );

      if (!response?.data?.events) return [];

      return response.data.events.map((event: any) => ({
        gameId: event.id,
        sport: "NHL",
        homeTeam: event.competitions[0]?.competitors?.find((c: any) => c.homeAway === "home")?.team?.displayName || "",
        awayTeam: event.competitions[0]?.competitors?.find((c: any) => c.homeAway === "away")?.team?.displayName || "",
        homeScore: parseInt(event.competitions[0]?.competitors?.find((c: any) => c.homeAway === "home")?.score || "0"),
        awayScore: parseInt(event.competitions[0]?.competitors?.find((c: any) => c.homeAway === "away")?.score || "0"),
        status: event.status?.type?.completed ? "final" : event.status?.type?.state === "in" ? "in_progress" : "scheduled",
        gameTime: new Date(event.date),
        playerStats: {},
      }));
    } catch (error) {
      console.error("Error fetching NHL scores:", error);
      return [];
    }
  }

  async getNFLScores(date?: Date): Promise<GameResult[]> {
    try {
      const dateStr = date ? this.formatDate(date) : this.formatDate(new Date());
      const response = await this.get<any>(
        `/football/nfl/scoreboard?dates=${dateStr}`
      );

      if (!response?.data?.events) return [];

      return response.data.events.map((event: any) => ({
        gameId: event.id,
        sport: "NFL",
        homeTeam: event.competitions[0]?.competitors?.find((c: any) => c.homeAway === "home")?.team?.displayName || "",
        awayTeam: event.competitions[0]?.competitors?.find((c: any) => c.homeAway === "away")?.team?.displayName || "",
        homeScore: parseInt(event.competitions[0]?.competitors?.find((c: any) => c.homeAway === "home")?.score || "0"),
        awayScore: parseInt(event.competitions[0]?.competitors?.find((c: any) => c.homeAway === "away")?.score || "0"),
        status: event.status?.type?.completed ? "final" : event.status?.type?.state === "in" ? "in_progress" : "scheduled",
        gameTime: new Date(event.date),
        playerStats: {},
      }));
    } catch (error) {
      console.error("Error fetching NFL scores:", error);
      return [];
    }
  }

  async getMLBScores(date?: Date): Promise<GameResult[]> {
    try {
      const dateStr = date ? this.formatDate(date) : this.formatDate(new Date());
      const response = await this.get<any>(
        `/baseball/mlb/scoreboard?dates=${dateStr}`
      );

      if (!response?.data?.events) return [];

      return response.data.events.map((event: any) => ({
        gameId: event.id,
        sport: "MLB",
        homeTeam: event.competitions[0]?.competitors?.find((c: any) => c.homeAway === "home")?.team?.displayName || "",
        awayTeam: event.competitions[0]?.competitors?.find((c: any) => c.homeAway === "away")?.team?.displayName || "",
        homeScore: parseInt(event.competitions[0]?.competitors?.find((c: any) => c.homeAway === "home")?.score || "0"),
        awayScore: parseInt(event.competitions[0]?.competitors?.find((c: any) => c.homeAway === "away")?.score || "0"),
        status: event.status?.type?.completed ? "final" : event.status?.type?.state === "in" ? "in_progress" : "scheduled",
        gameTime: new Date(event.date),
        playerStats: {},
      }));
    } catch (error) {
      console.error("Error fetching MLB scores:", error);
      return [];
    }
  }

  async getScoresBySport(sport: string, date?: Date): Promise<GameResult[]> {
    switch (sport.toUpperCase()) {
      case "NBA":
        return this.getNBAScores(date);
      case "NHL":
        return this.getNHLScores(date);
      case "NFL":
        return this.getNFLScores(date);
      case "MLB":
        return this.getMLBScores(date);
      default:
        console.warn(`Unknown sport: ${sport}`);
        return [];
    }
  }

  private formatDate(date: Date): string {
    return date.toISOString().split("T")[0].replace(/-/g, "");
  }
}

export const scoreboardClient = new ScoreboardClient();
