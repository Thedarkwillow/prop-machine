import { Router } from "express";
import { settlementService } from "./services/settlementService";
import { balldontlieClient } from "./integrations/balldontlieClient";
import { modelScorer } from "./ml/modelScorer";
import { storage } from "./storage";
import { propFetcherService } from "./services/propFetcherService";

// Admin middleware - require authentication AND admin role
async function requireAdmin(req: any, res: any, next: any) {
  if (!req.isAuthenticated || !req.isAuthenticated()) {
    return res.status(401).json({
      success: false,
      error: "Authentication required for admin access",
    });
  }
  
  try {
    const userId = req.user?.claims?.sub;
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: "Invalid user session",
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

export function adminRoutes(): Router {
  const router = Router();
  
  // Apply admin role check to ALL admin routes
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
      
      res.json({
        success: true,
        stats: {
          activeProps: allProps.length,
          sportBreakdown,
          models: allModels.length,
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
