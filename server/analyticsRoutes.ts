import { Router } from "express";
import type { IStorage } from "./storage";
import { AnalyticsService } from "./services/analyticsService";
import { getUserId } from "./middleware/auth";

export function createAnalyticsRoutes(storage: IStorage): Router {
  const router = Router();
  const analyticsService = new AnalyticsService(storage);

  router.get("/overview", async (req: any, res) => {
    const userId = getUserId(req);
    if (!userId) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    try {
      
      // Fetch all analytics data
      const [overview, bySport, byPlatform, confidenceBrackets] = await Promise.all([
        analyticsService.getLatestAnalytics(userId),
        analyticsService.getSportBreakdown(userId),
        analyticsService.getPlatformComparison(userId),
        analyticsService.getConfidenceAccuracy(userId),
      ]);

      // Get trends from history (last 30 days)
      const history = await analyticsService.getAnalyticsHistory(userId, 30);
      const trends = history.map((snapshot: any) => ({
        date: new Date(snapshot.date).toISOString().split('T')[0],
        winRate: snapshot.sportStats && snapshot.sportStats.length > 0
          ? snapshot.sportStats.reduce((sum: number, s: any) => sum + (s.winRate || 0), 0) / snapshot.sportStats.length
          : 0,
        roi: snapshot.sportStats && snapshot.sportStats.length > 0
          ? snapshot.sportStats.reduce((sum: number, s: any) => sum + (s.roi || 0), 0) / snapshot.sportStats.length
          : 0,
        clv: 0, // CLV not stored in snapshots currently
      }));

      res.json({
        overview: overview || { totalBets: 0, winRate: 0, roi: 0, avgClv: 0, currentStreak: { type: 'none', count: 0 } },
        bySport: bySport || [],
        byPlatform: byPlatform || [],
        confidenceBrackets: confidenceBrackets || {},
        trends: trends || [],
      });
    } catch (error) {
      console.error("Error getting analytics overview:", error);
      res.status(500).json({ error: "Failed to get analytics overview" });
    }
  });

  router.post("/snapshot", async (req: any, res) => {
    const userId = getUserId(req);
    if (!userId) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    try {
      await analyticsService.generateSnapshot(userId);
      res.json({ success: true, message: "Analytics snapshot generated" });
    } catch (error) {
      console.error("Error generating analytics snapshot:", error);
      res.status(500).json({ error: "Failed to generate analytics" });
    }
  });

  router.get("/latest", async (req: any, res) => {
    const userId = getUserId(req);
    if (!userId) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    try {
      const analytics = await analyticsService.getLatestAnalytics(userId);
      res.json(analytics || {});
    } catch (error) {
      console.error("Error getting latest analytics:", error);
      res.status(500).json({ error: "Failed to get analytics" });
    }
  });

  router.get("/history", async (req: any, res) => {
    const userId = getUserId(req);
    if (!userId) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    try {
      const days = parseInt(req.query.days as string) || 30;
      const history = await analyticsService.getAnalyticsHistory(userId, days);
      res.json(history);
    } catch (error) {
      console.error("Error getting analytics history:", error);
      res.status(500).json({ error: "Failed to get analytics history" });
    }
  });

  router.get("/platforms", async (req: any, res) => {
    const userId = getUserId(req);
    if (!userId) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    try {
      const platforms = await analyticsService.getPlatformComparison(userId);
      res.json(platforms);
    } catch (error) {
      console.error("Error getting platform comparison:", error);
      res.status(500).json({ error: "Failed to get platform data" });
    }
  });

  router.get("/sports", async (req: any, res) => {
    const userId = getUserId(req);
    if (!userId) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    try {
      const sports = await analyticsService.getSportBreakdown(userId);
      res.json(sports);
    } catch (error) {
      console.error("Error getting sport breakdown:", error);
      res.status(500).json({ error: "Failed to get sport data" });
    }
  });

  router.get("/confidence", async (req: any, res) => {
    const userId = getUserId(req);
    if (!userId) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    try {
      const brackets = await analyticsService.getConfidenceAccuracy(userId);
      res.json(brackets);
    } catch (error) {
      console.error("Error getting confidence accuracy:", error);
      res.status(500).json({ error: "Failed to get confidence data" });
    }
  });

  return router;
}
