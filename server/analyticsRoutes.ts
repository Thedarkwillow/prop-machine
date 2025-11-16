import { Router } from "express";
import type { IStorage } from "./storage";
import { AnalyticsService } from "./services/analyticsService";

export function createAnalyticsRoutes(storage: IStorage): Router {
  const router = Router();
  const analyticsService = new AnalyticsService(storage);

  router.get("/overview", async (req: any, res) => {
    if (!req.user) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    try {
      const userId = req.user.claims.sub;
      
      // Fetch all analytics data
      const [overview, bySport, byPlatform, confidenceBrackets] = await Promise.all([
        analyticsService.getLatestAnalytics(userId),
        analyticsService.getSportBreakdown(userId),
        analyticsService.getPlatformComparison(userId),
        analyticsService.getConfidenceAccuracy(userId),
      ]);

      res.json({
        overview: overview || { totalBets: 0, winRate: 0, roi: 0, avgClv: 0, currentStreak: { type: 'none', count: 0 } },
        bySport: bySport || [],
        byPlatform: byPlatform || [],
        confidenceBrackets: confidenceBrackets || {},
        trends: [], // Trends data can be fetched separately if needed
      });
    } catch (error) {
      console.error("Error getting analytics overview:", error);
      res.status(500).json({ error: "Failed to get analytics overview" });
    }
  });

  router.post("/snapshot", async (req: any, res) => {
    if (!req.user) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    try {
      const userId = req.user.claims.sub;
      await analyticsService.generateSnapshot(userId);
      res.json({ success: true, message: "Analytics snapshot generated" });
    } catch (error) {
      console.error("Error generating analytics snapshot:", error);
      res.status(500).json({ error: "Failed to generate analytics" });
    }
  });

  router.get("/latest", async (req: any, res) => {
    if (!req.user) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    try {
      const userId = req.user.claims.sub;
      const analytics = await analyticsService.getLatestAnalytics(userId);
      res.json(analytics || {});
    } catch (error) {
      console.error("Error getting latest analytics:", error);
      res.status(500).json({ error: "Failed to get analytics" });
    }
  });

  router.get("/history", async (req: any, res) => {
    if (!req.user) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    try {
      const userId = req.user.claims.sub;
      const days = parseInt(req.query.days as string) || 30;
      const history = await analyticsService.getAnalyticsHistory(userId, days);
      res.json(history);
    } catch (error) {
      console.error("Error getting analytics history:", error);
      res.status(500).json({ error: "Failed to get analytics history" });
    }
  });

  router.get("/platforms", async (req: any, res) => {
    if (!req.user) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    try {
      const userId = req.user.claims.sub;
      const platforms = await analyticsService.getPlatformComparison(userId);
      res.json(platforms);
    } catch (error) {
      console.error("Error getting platform comparison:", error);
      res.status(500).json({ error: "Failed to get platform data" });
    }
  });

  router.get("/sports", async (req: any, res) => {
    if (!req.user) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    try {
      const userId = req.user.claims.sub;
      const sports = await analyticsService.getSportBreakdown(userId);
      res.json(sports);
    } catch (error) {
      console.error("Error getting sport breakdown:", error);
      res.status(500).json({ error: "Failed to get sport data" });
    }
  });

  router.get("/confidence", async (req: any, res) => {
    if (!req.user) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    try {
      const userId = req.user.claims.sub;
      const brackets = await analyticsService.getConfidenceAccuracy(userId);
      res.json(brackets);
    } catch (error) {
      console.error("Error getting confidence accuracy:", error);
      res.status(500).json({ error: "Failed to get confidence data" });
    }
  });

  return router;
}
