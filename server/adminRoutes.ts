import { Router } from "express";
import { settlementService } from "./services/settlementService";
import { balldontlieClient } from "./integrations/balldontlieClient";
import { modelScorer } from "./ml/modelScorer";
import { storage } from "./storage";
import { propFetcherService } from "./services/propFetcherService";
import { propRefreshService } from "./services/propRefreshService";
import { propSchedulerService } from "./services/propSchedulerService";
import { refreshProps } from "./seed";
import { getUserId } from "./middleware/auth";

// Admin middleware - require authentication AND admin role
async function requireAdmin(req: any, res: any, next: any) {
  try {
    const userId = getUserId(req);
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: "Authentication required for admin access",
      });
    }
    
    const user = await storage.getUser(userId);
    if (!user || !user.isAdmin) {
      return res.status(403).json({
        success: false,
        error: "Admin privileges required",
      });
    }
    
    next();
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: "Failed to verify admin status",
    });
  }
}

// Require authentication (but not admin) for certain endpoints
async function requireAuth(req: any, res: any, next: any) {
  const userId = getUserId(req);
  if (!userId) {
    return res.status(401).json({
      success: false,
      error: "Authentication required",
    });
  }
  next();
}

export function adminRoutes(): Router {
  const router = Router();
  
  // Get prop scheduler status (public - read-only status info)
  router.get("/props/scheduler/status", async (req, res) => {
    try {
      const status = propSchedulerService.getStatus();
      res.json(status);
    } catch (error) {
      const err = error as Error;
      res.status(500).json({
        success: false,
        error: err.message,
      });
    }
  });

  // Multi-platform prop refresh (requires authentication, not admin)
  router.post("/props/refresh", requireAuth, async (req, res) => {
    try {
      const { sports } = req.body;
      const targetSports = sports || ['NBA', 'NFL', 'NHL'];
      
      // Use scheduler's triggerManualRefresh to update state properly
      const result = await propSchedulerService.triggerManualRefresh(targetSports);
      
      res.json({
        success: result.success,
        summary: {
          totalPropsFetched: result.totalPropsFetched,
          totalPropsCreated: result.totalPropsCreated,
          totalErrors: result.totalErrors,
        },
        results: result.results.map(r => ({
          platform: r.platform,
          sport: r.sport,
          propsFetched: r.propsFetched,
          propsCreated: r.propsCreated,
          propsSkipped: r.propsSkipped,
          errorCount: r.errors.length,
          errors: r.errors.slice(0, 5),
        })),
      });
    } catch (error) {
      const err = error as Error;
      console.error("Prop refresh error:", error);
      res.status(500).json({
        success: false,
        error: err.message,
      });
    }
  });
  
  // Apply admin role check to all routes below this point
  router.use(requireAdmin);

  // Manual settlement trigger
  router.post("/settlement/run", async (req, res) => {
    try {
      const { sport } = req.body;
      
      console.log(`Manual settlement triggered for sport: ${sport || 'all'}`);
      const report = await settlementService.settlePendingBets(sport);
      
      res.json({
        success: true,
        report,
      });
    } catch (error) {
      const err = error as Error;
      console.error("Settlement error:", error);
      res.status(500).json({
        success: false,
        error: err.message,
      });
    }
  });

  // Fetch and analyze props from The Odds API
  router.post("/props/fetch", async (req, res) => {
    try {
      const { sport } = req.body;
      const targetSport = sport || 'NBA';
      
      console.log(`Fetching props for ${targetSport}...`);
      const result = await propFetcherService.fetchAndAnalyzeProps(targetSport);
      
      // Always return 200 if the request was processed successfully
      // tierLimited flag indicates if feature is unavailable due to API tier restrictions
      res.json({
        success: result.success,
        tierLimited: result.tierLimited || false,
        sport: result.sport,
        summary: {
          propsFetched: result.propsFetched,
          propsCreated: result.propsCreated,
          propsSkipped: result.propsSkipped,
          errorCount: result.errors.length,
          warningCount: result.warnings?.length || 0,
        },
        errors: result.errors.slice(0, 10),
        warnings: result.warnings || [],
      });
    } catch (error) {
      const err = error as Error;
      console.error("Prop fetch error:", error);
      res.status(500).json({
        success: false,
        error: err.message,
      });
    }
  });

  // Refresh sample props with current game times (for development)
  router.post("/props/refresh-samples", async (req, res) => {
    try {
      console.log("Refreshing sample props with current game times...");
      const result = await refreshProps();
      
      if (result.success) {
        res.json({
          success: true,
          message: `Refreshed ${result.count} sample props with current game times`,
          count: result.count,
        });
      } else {
        res.status(500).json({
          success: false,
          error: result.error || "Failed to refresh props",
        });
      }
    } catch (error) {
      const err = error as Error;
      console.error("Sample props refresh error:", error);
      res.status(500).json({
        success: false,
        error: err.message,
      });
    }
  });

  // Create performance snapshot for a user
  router.post("/performance/snapshot", async (req, res) => {
    try {
      const { userId } = req.body;
      
      if (!userId) {
        return res.status(400).json({
          success: false,
          error: "userId is required",
        });
      }
      
      await settlementService.createPerformanceSnapshot(userId);
      
      res.json({
        success: true,
        message: `Performance snapshot created for user ${userId}`,
      });
    } catch (error) {
      const err = error as Error;
      console.error("Snapshot error:", error);
      res.status(500).json({
        success: false,
        error: err.message,
      });
    }
  });

  // Test BALLDONTLIE integration
  router.get("/test/balldontlie", async (req, res) => {
    try {
      const todaysGames = await balldontlieClient.getTodaysGames();
      
      res.json({
        success: true,
        gamesCount: todaysGames.data.length,
        games: todaysGames.data.slice(0, 5), // First 5 games
      });
    } catch (error) {
      const err = error as Error;
      console.error("BALLDONTLIE test error:", error);
      res.status(500).json({
        success: false,
        error: err.message,
      });
    }
  });

  // Test ML model scorer
  router.post("/test/model", async (req, res) => {
    try {
      const features = {
        playerName: req.body.playerName || "Test Player",
        stat: req.body.stat || "Points",
        line: req.body.line || 25.5,
        direction: req.body.direction || "over",
        sport: req.body.sport || "NBA",
        recentAverage: req.body.recentAverage || 27.3,
        seasonAverage: req.body.seasonAverage || 26.8,
        opponentRanking: req.body.opponentRanking || 20,
        homeAway: req.body.homeAway || "home",
        lineMovement: req.body.lineMovement || 0.5,
      };
      
      const score = await modelScorer.scoreProp(features);
      
      res.json({
        success: true,
        features,
        score,
      });
    } catch (error) {
      const err = error as Error;
      console.error("Model test error:", error);
      res.status(500).json({
        success: false,
        error: err.message,
      });
    }
  });

  // Get system stats
  router.get("/stats", async (req, res) => {
    try {
      const allProps = await storage.getAllActiveProps();
      const allModels = await storage.getAllModels();
      
      const sportBreakdown = allProps.reduce((acc, prop) => {
        acc[prop.sport] = (acc[prop.sport] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);
      
      // Calculate fixture_id coverage
      const propsWithFixtureId = allProps.filter(p => p.fixtureId !== null && p.fixtureId !== undefined);
      const dfsProps = allProps.filter(p => p.platform === 'PrizePicks' || p.platform === 'Underdog');
      const dfsPropsWithFixtureId = dfsProps.filter(p => p.fixtureId !== null && p.fixtureId !== undefined);
      
      res.json({
        success: true,
        stats: {
          activeProps: allProps.length,
          sportBreakdown,
          models: allModels.length,
          fixtureIdCoverage: {
            total: allProps.length,
            withFixtureId: propsWithFixtureId.length,
            percentage: allProps.length > 0 ? Math.round((propsWithFixtureId.length / allProps.length) * 100) : 0,
            dfsTotal: dfsProps.length,
            dfsWithFixtureId: dfsPropsWithFixtureId.length,
            dfsPercentage: dfsProps.length > 0 ? Math.round((dfsPropsWithFixtureId.length / dfsProps.length) * 100) : 0,
          },
        },
      });
    } catch (error) {
      const err = error as Error;
      console.error("Stats error:", error);
      res.status(500).json({
        success: false,
        error: err.message,
      });
    }
  });

  // Manually rescore all props
  router.post("/props/rescore", async (req, res) => {
    try {
      const allProps = await storage.getAllActiveProps();
      let rescored = 0;
      
      for (const prop of allProps) {
        // In production, fetch actual player stats and opponent data
        // For now, use mock data based on existing prop confidence
        const mockFeatures = {
          playerName: prop.player,
          stat: prop.stat,
          line: parseFloat(prop.line),
          direction: prop.direction,
          sport: prop.sport,
          recentAverage: parseFloat(prop.line) * (prop.confidence / 100 + 0.2),
          seasonAverage: parseFloat(prop.line) * (prop.confidence / 100 + 0.1),
          opponentRanking: 15,
          homeAway: 'home' as const,
          lineMovement: prop.currentLine ? parseFloat(prop.currentLine) - parseFloat(prop.line) : 0,
        };
        
        const score = await modelScorer.scoreProp(mockFeatures);
        
        // Update prop with new scores would require an updateProp method in storage
        // For now, just count
        rescored++;
      }
      
      res.json({
        success: true,
        message: `Rescored ${rescored} props`,
        propsRescored: rescored,
      });
    } catch (error) {
      const err = error as Error;
      console.error("Rescore error:", error);
      res.status(500).json({
        success: false,
        error: err.message,
      });
    }
  });

  return router;
}
