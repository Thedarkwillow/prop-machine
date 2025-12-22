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
import { opticOddsStreamService } from "./services/opticOddsStreamService";
import { prizePicksClient } from "./integrations/prizePicksClient";

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
        results: result.results.map((r: any) => ({
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
      
      // Check cache state
      const cacheInfo: Record<string, any> = {};
      try {
        const { propCacheService } = await import("./services/propCacheService.js");
        for (const sport of ['NBA', 'NFL', 'NHL']) {
          for (const platform of ['PrizePicks', 'Underdog']) {
            try {
              const cached = await propCacheService.getProps(sport, platform);
              cacheInfo[`${sport}_${platform}`] = {
                count: Array.isArray(cached) ? cached.length : 0,
                hasData: Array.isArray(cached) && cached.length > 0,
              };
            } catch (err) {
              cacheInfo[`${sport}_${platform}`] = { error: (err as Error).message };
            }
          }
        }
      } catch (err) {
        cacheInfo.error = (err as Error).message;
      }
      
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
          cache: cacheInfo,
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
      const { useRealStats = false, limit } = req.body;
      const maxPropsForRealStats = 100; // Safety limit to prevent timeout/rate limits
      
      let propsToRescore = await storage.getAllActiveProps();
      
      // If using real stats, limit the number to prevent timeout/rate limits
      if (useRealStats && (!limit || limit > maxPropsForRealStats)) {
        propsToRescore = propsToRescore.slice(0, maxPropsForRealStats);
        console.log(`⚠️ Real stats limited to ${maxPropsForRealStats} props to prevent timeout/rate limits`);
      } else if (limit && limit < propsToRescore.length) {
        propsToRescore = propsToRescore.slice(0, limit);
      }
      
      let rescored = 0;
      let updated = 0;
      let skipped = 0;
      const errors: string[] = [];
      const { propAnalysisService } = await import("./services/propAnalysisService.js");
      const { modelScorer } = await import("./ml/modelScorer.js");
      
      for (const prop of propsToRescore) {
        try {
          let score;
          
          if (useRealStats) {
            // Use real player stats from APIs (slower but more accurate)
            try {
              const analysisInput = {
                sport: prop.sport,
                player: prop.player,
                team: prop.team,
                opponent: prop.opponent,
                stat: prop.stat,
                line: prop.line,
                direction: prop.direction as 'over' | 'under',
                platform: prop.platform,
                gameTime: prop.gameTime,
              };
              
              const analysis = await propAnalysisService.analyzeProp(analysisInput);
              score = {
                confidence: analysis.confidence,
                expectedValue: analysis.ev,
                modelProbability: analysis.modelProbability,
              };
            } catch (apiError: any) {
              // Fall back to mock if API fails
              console.warn(`Real stats failed for ${prop.player}, using mock data:`, apiError.message);
              throw apiError; // Will be caught by outer catch and use mock
            }
          } else {
            // Use mock data based on existing prop (faster for bulk operations)
            // This recalculates confidence/EV based on current line movements
            const lineMovement = prop.currentLine ? parseFloat(prop.currentLine) - parseFloat(prop.line) : 0;
            const mockFeatures = {
              playerName: prop.player,
              stat: prop.stat,
              line: parseFloat(prop.line),
              direction: prop.direction as 'over' | 'under',
              sport: prop.sport,
              // Derive reasonable averages from line and existing confidence
              recentAverage: parseFloat(prop.line) * (prop.confidence / 100 + 0.15),
              seasonAverage: parseFloat(prop.line) * (prop.confidence / 100 + 0.1),
              opponentRanking: 15, // Neutral ranking
              homeAway: 'home' as const,
              lineMovement,
            };
            
            const modelScore = await modelScorer.scoreProp(mockFeatures);
            score = {
              confidence: modelScore.confidence,
              expectedValue: modelScore.expectedValue,
              modelProbability: modelScore.modelProbability,
            };
          }
          
          // Only update if scores changed significantly (avoid unnecessary DB writes)
          const confidenceChanged = Math.abs(score.confidence - prop.confidence) >= 1;
          const evChanged = Math.abs(score.expectedValue - parseFloat(prop.ev)) >= 0.1;
          
          if (confidenceChanged || evChanged) {
            await storage.updateProp(prop.id, {
              confidence: score.confidence,
              ev: score.expectedValue.toString(),
              modelProbability: score.modelProbability.toString(),
            });
            updated++;
          } else {
            skipped++;
          }
        } catch (error: any) {
          errors.push(`Prop ${prop.id} (${prop.player} ${prop.stat}): ${error.message}`);
        }
        rescored++;
      }
      
      res.json({
        success: true,
        message: `Rescored ${rescored} props, updated ${updated} props, skipped ${skipped} (no significant change)`,
        method: useRealStats ? 'real_stats' : 'mock_data',
        propsRescored: rescored,
        propsUpdated: updated,
        propsSkipped: skipped,
        errors: errors.slice(0, 10), // Return first 10 errors if any
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

  // OpticOdds Streaming Endpoints
  
  // Start a new OpticOdds stream for PrizePicks/Underdog
  router.post("/streaming/start", async (req, res) => {
    try {
      const { sport, sportsbooks } = req.body;
      
      if (!sport) {
        return res.status(400).json({
          success: false,
          error: "sport is required (e.g., basketball_nba, icehockey_nhl)",
        });
      }
      
      const targetSportsbooks = sportsbooks || ['PrizePicks', 'Underdog'];
      
      const streamId = opticOddsStreamService.startOddsStream({
        sport,
        sportsbooks: targetSportsbooks,
      });
      
      res.json({
        success: true,
        streamId,
        sport,
        sportsbooks: targetSportsbooks,
        message: `Started streaming ${targetSportsbooks.join(' and ')} odds for ${sport}`,
      });
    } catch (error) {
      const err = error as Error;
      console.error("Stream start error:", error);
      res.status(500).json({
        success: false,
        error: err.message,
      });
    }
  });
  
  // Stop a specific stream
  router.post("/streaming/stop", async (req, res) => {
    try {
      const { streamId } = req.body;
      
      if (!streamId) {
        return res.status(400).json({
          success: false,
          error: "streamId is required",
        });
      }
      
      const stopped = opticOddsStreamService.stopStream(streamId);
      
      if (stopped) {
        res.json({
          success: true,
          message: `Stopped stream: ${streamId}`,
        });
      } else {
        res.status(404).json({
          success: false,
          error: `Stream not found: ${streamId}`,
        });
      }
    } catch (error) {
      const err = error as Error;
      console.error("Stream stop error:", error);
      res.status(500).json({
        success: false,
        error: err.message,
      });
    }
  });
  
  // Stop all active streams
  router.post("/streaming/stop-all", async (req, res) => {
    try {
      opticOddsStreamService.stopAllStreams();
      
      res.json({
        success: true,
        message: "Stopped all active streams",
      });
    } catch (error) {
      const err = error as Error;
      console.error("Stream stop-all error:", error);
      res.status(500).json({
        success: false,
        error: err.message,
      });
    }
  });
  
  // Get status of all active streams
  router.get("/streaming/status", async (req, res) => {
    try {
      const activeStreams = opticOddsStreamService.getActiveStreams();
      
      res.json({
        success: true,
        activeStreams,
        count: activeStreams.length,
      });
    } catch (error) {
      const err = error as Error;
      console.error("Stream status error:", error);
      res.status(500).json({
        success: false,
        error: err.message,
      });
    }
  });

  // Test PrizePicks API - discover NHL league ID
  router.get("/prizepicks/test", requireAdmin, async (req, res) => {
    try {
      const { leagueId } = req.query;
      
      if (leagueId) {
        // Test a specific league ID
        const props = await prizePicksClient.getProjections(leagueId as string);
        res.json({
          success: true,
          leagueId,
          propsCount: props.length,
          sampleProps: props.slice(0, 5),
          sports: Array.from(new Set(props.map(p => p.sport))),
          leagues: Array.from(new Set(props.map(p => p.league))),
        });
      } else {
        // Try NHL discovery
        const nhlProps = await prizePicksClient.getNHLProjections();
        const faceoffProps = nhlProps.filter(p => 
          p.stat.toLowerCase().includes('faceoff')
        );
        
        res.json({
          success: true,
          totalNHL: nhlProps.length,
          faceoffCount: faceoffProps.length,
          faceoffs: faceoffProps,
          sampleProps: nhlProps.slice(0, 10),
        });
      }
    } catch (error) {
      const err = error as Error;
      console.error("PrizePicks test error:", error);
      res.status(500).json({
        success: false,
        error: err.message,
      });
    }
  });

  // Manual test prop ingestion endpoint
  router.post("/ingest/test-props", requireAdmin, async (req, res) => {
    try {
      console.log("[INGEST] Starting manual test prop ingestion...");
      
      const gameTime = new Date(Date.now() + 2 * 60 * 60 * 1000); // 2 hours from now
      
      const testProps = [
        {
          sport: "NHL",
          player: "Connor McDavid",
          team: "EDM",
          opponent: "TOR",
          stat: "SOG",
          line: "3.5",
          currentLine: "3.5",
          direction: "over" as const,
          platform: "PrizePicks",
          confidence: 87,
          ev: "8.2",
          modelProbability: "0.7234",
          gameTime,
          isActive: true,
        },
        {
          sport: "NHL",
          player: "Auston Matthews",
          team: "TOR",
          opponent: "EDM",
          stat: "Points",
          line: "1.5",
          currentLine: "1.5",
          direction: "over" as const,
          platform: "Underdog",
          confidence: 78,
          ev: "6.1",
          modelProbability: "0.6812",
          gameTime,
          isActive: true,
        },
        {
          sport: "NHL",
          player: "Igor Shesterkin",
          team: "NYR",
          opponent: "BOS",
          stat: "Saves",
          line: "30.5",
          currentLine: "30.5",
          direction: "over" as const,
          platform: "PrizePicks",
          confidence: 81,
          ev: "7.4",
          modelProbability: "0.6945",
          gameTime,
          isActive: true,
        },
        {
          sport: "NBA",
          player: "LeBron James",
          team: "LAL",
          opponent: "GSW",
          stat: "Points",
          line: "25.5",
          currentLine: "25.5",
          direction: "over" as const,
          platform: "PrizePicks",
          confidence: 75,
          ev: "5.8",
          modelProbability: "0.6523",
          gameTime,
          isActive: true,
        },
        {
          sport: "NBA",
          player: "Stephen Curry",
          team: "GSW",
          opponent: "LAL",
          stat: "Assists",
          line: "6.5",
          currentLine: "6.5",
          direction: "over" as const,
          platform: "Underdog",
          confidence: 72,
          ev: "4.5",
          modelProbability: "0.6234",
          gameTime,
          isActive: true,
        },
        {
          sport: "NBA",
          player: "Nikola Jokic",
          team: "DEN",
          opponent: "PHX",
          stat: "Rebounds",
          line: "12.5",
          currentLine: "12.5",
          direction: "over" as const,
          platform: "PrizePicks",
          confidence: 82,
          ev: "7.8",
          modelProbability: "0.7123",
          gameTime,
          isActive: true,
        },
        {
          sport: "NHL",
          player: "Nathan MacKinnon",
          team: "COL",
          opponent: "VGK",
          stat: "SOG",
          line: "4.5",
          currentLine: "4.5",
          direction: "over" as const,
          platform: "Underdog",
          confidence: 65,
          ev: "3.2",
          modelProbability: "0.6234",
          gameTime,
          isActive: true,
        },
        {
          sport: "NHL",
          player: "Leon Draisaitl",
          team: "EDM",
          opponent: "TOR",
          stat: "Points",
          line: "1.5",
          currentLine: "1.5",
          direction: "over" as const,
          platform: "PrizePicks",
          confidence: 72,
          ev: "4.8",
          modelProbability: "0.6523",
          gameTime,
          isActive: true,
        },
      ];
      
      console.log(`[INGEST] Inserting ${testProps.length} test props...`);
      
      const insertedProps = [];
      for (const prop of testProps) {
        const inserted = await storage.createProp(prop);
        insertedProps.push(inserted);
        console.log(`[INGEST] Inserted prop ID ${inserted.id}: ${prop.sport} - ${prop.player} ${prop.stat} ${prop.direction} ${prop.line} (${prop.platform})`);
      }
      
      console.log(`[INGEST] ✅ Completed: ${insertedProps.length} props inserted`);
      console.log(`[INGEST] Sample inserted prop:`, {
        id: insertedProps[0].id,
        sport: insertedProps[0].sport,
        player: insertedProps[0].player,
        stat: insertedProps[0].stat,
        platform: insertedProps[0].platform,
        gameTime: insertedProps[0].gameTime,
      });
      
      res.json({
        success: true,
        inserted: insertedProps.length,
        props: insertedProps.map(p => ({
          id: p.id,
          sport: p.sport,
          player: p.player,
          stat: p.stat,
          platform: p.platform,
        })),
      });
    } catch (error) {
      const err = error as Error;
      console.error("[INGEST] ❌ Error inserting test props:", err);
      res.status(500).json({
        success: false,
        error: err.message,
      });
    }
  });

  // Ingest props from all platforms
  router.post("/ingest/props", requireAdmin, async (req, res) => {
    try {
      console.log('[INGESTION] Manual prop ingestion triggered');
      
      const { ingestUnderdog } = await import("./ingestion/ingestUnderdog.js");
      const { ingestPrizePicks } = await import("./ingestion/ingestPrizePicks.js");
      
      // Run both scrapers sequentially
      const [underdogResult, prizepicksResult] = await Promise.all([
        ingestUnderdog(),
        ingestPrizePicks(),
      ]);
      
      res.json({
        ok: underdogResult.errors.length === 0 && prizepicksResult.errors.length === 0,
        underdog: {
          found: underdogResult.found,
          inserted: underdogResult.inserted,
        },
        prizepicks: {
          found: prizepicksResult.found,
          inserted: prizepicksResult.inserted,
        },
        errors: [
          ...underdogResult.errors,
          ...prizepicksResult.errors,
        ].slice(0, 10),
      });
    } catch (error) {
      const err = error as Error;
      console.error('[INGESTION] Prop ingestion error:', err);
      res.status(500).json({
        ok: false,
        error: err.message,
      });
    }
  });

  // Props health endpoint
  router.get("/props/health", requireAdmin, async (req, res) => {
    try {
      const { db } = await import("./db.js");
      const { props: propsTable } = await import("../shared/schema.js");
      const { eq, sql, desc } = await import("drizzle-orm");
      
      // Total counts
      const totalProps = await db.select().from(propsTable);
      const activeProps = await db.select().from(propsTable).where(eq(propsTable.isActive, true));
      
      // Count by sport
      const sportCounts: Record<string, number> = {};
      const activeSportCounts: Record<string, number> = {};
      for (const prop of totalProps) {
        sportCounts[prop.sport] = (sportCounts[prop.sport] || 0) + 1;
        if (prop.isActive) {
          activeSportCounts[prop.sport] = (activeSportCounts[prop.sport] || 0) + 1;
        }
      }
      
      // Count by platform
      const platformCounts: Record<string, number> = {};
      const activePlatformCounts: Record<string, number> = {};
      for (const prop of totalProps) {
        platformCounts[prop.platform] = (platformCounts[prop.platform] || 0) + 1;
        if (prop.isActive) {
          activePlatformCounts[prop.platform] = (activePlatformCounts[prop.platform] || 0) + 1;
        }
      }
      
      // Most recent createdAt (using createdAt instead of updatedAt)
      const mostRecent = await db
        .select()
        .from(propsTable)
        .orderBy(desc(propsTable.createdAt))
        .limit(1);
      
      // Last 5 rows
      const last5 = await db
        .select({
          id: propsTable.id,
          sport: propsTable.sport,
          platform: propsTable.platform,
          player: propsTable.player,
          stat: propsTable.stat,
          line: propsTable.line,
          gameTime: propsTable.gameTime,
          createdAt: propsTable.createdAt,
        })
        .from(propsTable)
        .orderBy(desc(propsTable.createdAt))
        .limit(5);
      
      res.json({
        summary: {
          total: totalProps.length,
          active: activeProps.length,
          mostRecentCreatedAt: mostRecent[0]?.createdAt || null,
        },
        bySport: {
          total: sportCounts,
          active: activeSportCounts,
        },
        byPlatform: {
          total: platformCounts,
          active: activePlatformCounts,
        },
        last5Rows: last5,
      });
    } catch (error) {
      const err = error as Error;
      console.error('[HEALTH] Error fetching props health:', err);
      res.status(500).json({
        ok: false,
        error: err.message,
      });
    }
  });

  return router;
}
