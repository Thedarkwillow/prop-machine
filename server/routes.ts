import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage, type PropWithLineMovement } from "./storage";
import { insertPropSchema, insertSlipSchema, insertBetSchema, type Prop } from "@shared/schema";
import {
  updateBankrollSchema,
  updateSlipStatusSchema,
  settleBetSchema,
  queryParamsSportSchema,
  queryParamsWeek1Schema,
  queryParamsSlipStatusSchema,
  queryParamsDaysSchema,
  userIdParamSchema,
  betIdParamSchema,
  slipIdParamSchema,
  propIdParamSchema,
  analyzePropSchema,
} from "./validation";
import { ZodError } from "zod";
import { setupAuth, isAuthenticated } from "./auth";
import { adminRoutes } from "./adminRoutes";
import { createNotificationRoutes } from "./notificationRoutes";
import { createAnalyticsRoutes } from "./analyticsRoutes";

function transformPropForAPI(prop: Prop | PropWithLineMovement) {
  const baseProp = {
    id: prop.id,
    sport: prop.sport,
    player: prop.player,
    team: prop.team,
    opponent: prop.opponent,
    stat: prop.stat,
    line: Number(prop.line),
    currentLine: prop.currentLine ? Number(prop.currentLine) : null,
    direction: prop.direction,
    platform: prop.platform,
    confidence: prop.confidence,
    ev: Number(prop.ev),
    modelProbability: Number(prop.modelProbability),
    gameTime: prop.gameTime,
    isActive: prop.isActive,
    createdAt: prop.createdAt,
  };

  // Add line movement data if available
  if ('latestLineMovement' in prop && prop.latestLineMovement) {
    return {
      ...baseProp,
      lineMovement: {
        previousLine: Number(prop.latestLineMovement.oldLine),
        currentLine: Number(prop.latestLineMovement.newLine),
        change: Number(prop.latestLineMovement.movement),
        timestamp: prop.latestLineMovement.timestamp,
      },
    };
  }

  return baseProp;
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Setup authentication middleware first
  await setupAuth(app);

  // Auth routes
  app.get('/api/auth/user', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });
  // User routes
  app.get("/api/user/:userId", async (req, res) => {
    try {
      const { userId } = userIdParamSchema.parse(req.params);
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }
      res.json(user);
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({ error: "Invalid user ID", details: error.errors });
      }
      res.status(500).json({ error: "Failed to fetch user" });
    }
  });

  app.patch("/api/user/:userId/bankroll", async (req, res) => {
    try {
      const { userId } = userIdParamSchema.parse(req.params);
      const validatedBody = updateBankrollSchema.parse(req.body);
      
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }
      
      const updatedUser = await storage.updateBankroll(userId, validatedBody.bankroll);
      res.json(updatedUser);
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({ error: "Invalid request", details: error.errors });
      }
      res.status(500).json({ error: "Failed to update bankroll" });
    }
  });

  // Props routes
  app.get("/api/props", async (req, res) => {
    try {
      const validatedQuery = queryParamsSportSchema.parse(req.query);
      const props = await storage.getActivePropsWithLineMovement(validatedQuery.sport);
      res.json(props.map(transformPropForAPI));
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({ error: "Invalid query parameters", details: error.errors });
      }
      res.status(500).json({ error: "Failed to fetch props" });
    }
  });

  // Path parameter version for TanStack Query's default fetcher
  app.get("/api/props/:sport", async (req, res) => {
    try {
      const { sport } = req.params;
      const props = await storage.getActivePropsWithLineMovement(sport as any);
      res.json(props.map(transformPropForAPI));
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch props" });
    }
  });

  app.post("/api/props", async (req, res) => {
    try {
      const validatedProp = insertPropSchema.parse(req.body);
      const prop = await storage.createProp(validatedProp);
      res.json(prop);
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({ error: "Invalid prop data", details: error.errors });
      }
      res.status(500).json({ error: "Failed to create prop" });
    }
  });

  app.post("/api/props/analyze", async (req, res) => {
    try {
      const validatedData = analyzePropSchema.parse(req.body);
      
      const { propAnalysisService } = await import('./services/propAnalysisService');
      const result = await propAnalysisService.analyzeProp({
        sport: validatedData.sport,
        player: validatedData.player,
        team: validatedData.team,
        opponent: validatedData.opponent,
        stat: validatedData.stat,
        line: validatedData.line,
        direction: validatedData.direction,
        platform: validatedData.platform,
      });
      
      res.json(result);
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({ error: "Invalid prop data", details: error.errors });
      }
      console.error("Error analyzing prop:", error);
      res.status(500).json({ error: "Failed to analyze prop" });
    }
  });

  // Slips routes
  app.get("/api/slips/:userId", async (req, res) => {
    try {
      const { userId } = userIdParamSchema.parse(req.params);
      const validatedQuery = queryParamsSlipStatusSchema.parse(req.query);
      
      let slips;
      if (validatedQuery.status === "pending") {
        slips = await storage.getPendingSlips(userId);
      } else {
        slips = await storage.getSlipsByUser(userId);
      }
      res.json(slips);
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({ error: "Invalid request", details: error.errors });
      }
      res.status(500).json({ error: "Failed to fetch slips" });
    }
  });

  app.post("/api/slips", async (req, res) => {
    try {
      const validatedSlip = insertSlipSchema.parse(req.body);
      const slip = await storage.createSlip(validatedSlip);
      res.json(slip);
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({ error: "Invalid slip data", details: error.errors });
      }
      res.status(500).json({ error: "Failed to create slip" });
    }
  });

  app.patch("/api/slips/:slipId/status", async (req, res) => {
    try {
      const { slipId } = slipIdParamSchema.parse(req.params);
      const validatedBody = updateSlipStatusSchema.parse(req.body);
      const slip = await storage.updateSlipStatus(slipId, validatedBody.status);
      if (!slip) {
        return res.status(404).json({ error: "Slip not found" });
      }
      res.json(slip);
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({ error: "Invalid request", details: error.errors });
      }
      res.status(500).json({ error: "Failed to update slip" });
    }
  });

  // Generate daily slips
  app.post("/api/slips/generate/:userId", async (req, res) => {
    try {
      const { userId } = userIdParamSchema.parse(req.params);
      
      // Get user for bankroll and Kelly multiplier
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      // Get all active props
      const allProps = await storage.getAllActiveProps();
      
      // Import slip generator
      const { generateDailySlips, formatSlip, RISK_PROFILES } = await import('./slipGenerator');
      
      // Generate slips
      const slips = generateDailySlips(allProps);
      const bankroll = parseFloat(user.bankroll);
      const kellyMultiplier = parseFloat(user.kellyMultiplier);

      // Format and return slips
      const formattedSlips = {
        conservative: slips.conservative.length > 0 
          ? formatSlip(slips.conservative, RISK_PROFILES.conservative, bankroll, kellyMultiplier)
          : null,
        balanced: slips.balanced.length > 0
          ? formatSlip(slips.balanced, RISK_PROFILES.balanced, bankroll, kellyMultiplier)
          : null,
        aggressive: slips.aggressive.length > 0
          ? formatSlip(slips.aggressive, RISK_PROFILES.aggressive, bankroll, kellyMultiplier)
          : null,
      };

      res.json(formattedSlips);
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({ error: "Invalid request", details: error.errors });
      }
      res.status(500).json({ error: "Failed to generate slips" });
    }
  });

  // Bets routes
  app.get("/api/bets/:userId", async (req, res) => {
    try {
      const { userId } = userIdParamSchema.parse(req.params);
      const validatedQuery = queryParamsWeek1Schema.parse(req.query);
      const week1 = validatedQuery.week1 === "true";
      
      let bets;
      if (week1) {
        bets = await storage.getWeek1Bets(userId);
      } else {
        // Return bets with joined prop information for bet history display
        bets = await storage.getBetsWithProps(userId);
      }
      res.json(bets);
    } catch (error) {
      console.error("Error in /api/bets/:userId:", error);
      if (error instanceof ZodError) {
        return res.status(400).json({ error: "Invalid request", details: error.errors });
      }
      res.status(500).json({ error: "Failed to fetch bets" });
    }
  });

  app.post("/api/bets/:userId", async (req, res) => {
    try {
      const { userId } = userIdParamSchema.parse(req.params);
      
      // Calculate potential return from amount and odds
      const amount = parseFloat(req.body.amount);
      const odds = parseFloat(req.body.odds);
      const potentialReturn = (amount * odds).toFixed(2);
      
      // Merge userId from path with bet data from body
      const betData = {
        ...req.body,
        userId,
        potentialReturn,
        // Convert numeric openingLine to string for decimal field
        openingLine: req.body.openingLine ? String(req.body.openingLine) : undefined,
      };
      
      const validatedBet = insertBetSchema.parse(betData);
      
      // Atomically validate bankroll and place bet
      const result = await storage.placeBetWithBankrollCheck(validatedBet);
      
      if (!result.success) {
        return res.status(400).json({ error: result.error });
      }
      
      res.json(result.bet);
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({ error: "Invalid bet data", details: error.errors });
      }
      res.status(500).json({ error: "Failed to create bet" });
    }
  });

  app.patch("/api/bets/:betId/settle", async (req, res) => {
    try {
      const { betId } = betIdParamSchema.parse(req.params);
      const validatedBody = settleBetSchema.parse(req.body);
      
      // Fetch bet to get propId and openingLine
      const existingBet = await storage.getBet(betId);
      
      if (!existingBet) {
        return res.status(404).json({ error: "Bet not found" });
      }
      
      let closingLine = validatedBody.closingLine;
      let clv = validatedBody.clv;
      
      // Auto-calculate CLV from currentLine if bet has a propId
      if (existingBet.propId) {
        const allProps = await storage.getAllActiveProps();
        const prop = allProps.find(p => p.id === existingBet.propId);
        
        if (prop && prop.currentLine) {
          // Use currentLine as closingLine
          closingLine = prop.currentLine;
          
          // Calculate CLV: difference between opening and closing line
          // Use opening line from bet (or fallback to prop line)
          const openingLineNum = existingBet.openingLine ? parseFloat(existingBet.openingLine) : parseFloat(prop.line);
          const closingLineNum = parseFloat(prop.currentLine);
          const delta = closingLineNum - openingLineNum;
          
          // For "over" bets: positive delta = favorable (line went up after bet placed)
          // For "under" bets: negative delta = favorable (line went down after bet placed)
          // Use bet's direction (snapshotted at bet time) for accurate historical CLV
          // Fallback to prop direction for legacy bets without direction field
          const direction = existingBet.direction || prop.direction;
          const favorableMultiplier = direction === 'over' ? 1 : -1;
          clv = (delta * favorableMultiplier).toFixed(2);
        }
      }
      
      // Atomically settle bet and update bankroll
      const result = await storage.settleBetWithBankrollUpdate(
        betId,
        validatedBody.status,
        closingLine || undefined,
        clv || undefined
      );
      
      if (!result.success) {
        return res.status(400).json({ error: result.error });
      }
      
      res.json({ 
        bet: result.bet, 
        bankrollChange: result.bankrollChange 
      });
    } catch (error) {
      console.error("Error settling bet:", error);
      if (error instanceof ZodError) {
        return res.status(400).json({ error: "Invalid request", details: error.errors });
      }
      res.status(500).json({ error: "Failed to settle bet", details: error instanceof Error ? error.message : String(error) });
    }
  });

  // Performance routes
  app.get("/api/performance/:userId/latest", async (req, res) => {
    try {
      const { userId } = userIdParamSchema.parse(req.params);
      const snapshot = await storage.getLatestSnapshot(userId);
      res.json(snapshot || null);
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({ error: "Invalid user ID", details: error.errors });
      }
      res.status(500).json({ error: "Failed to fetch performance" });
    }
  });

  app.get("/api/performance/:userId/history", async (req, res) => {
    try {
      const { userId } = userIdParamSchema.parse(req.params);
      const validatedQuery = queryParamsDaysSchema.parse(req.query);
      const days = validatedQuery.days || 7;
      const snapshots = await storage.getSnapshotHistory(userId, days);
      res.json(snapshots);
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({ error: "Invalid request", details: error.errors });
      }
      res.status(500).json({ error: "Failed to fetch performance history" });
    }
  });

  // Dashboard summary endpoint
  app.get("/api/dashboard/:userId", async (req, res) => {
    try {
      const { userId } = userIdParamSchema.parse(req.params);
      
      const user = await storage.getUser(userId);
      const bets = await storage.getBetsByUser(userId);
      const week1Bets = await storage.getWeek1Bets(userId);
      const pendingSlips = await storage.getPendingSlips(userId);
      const latestSnapshot = await storage.getLatestSnapshot(userId);
      
      // Calculate metrics
      const settledBets = bets.filter(b => b.status !== "pending");
      const wins = settledBets.filter(b => b.status === "won").length;
      const losses = settledBets.filter(b => b.status === "lost").length;
      const winRate = settledBets.length > 0 ? (wins / settledBets.length) * 100 : 0;
      
      const totalWagered = bets.reduce((sum, b) => sum + parseFloat(b.amount), 0);
      const totalReturns = bets
        .filter(b => b.status === "won")
        .reduce((sum, b) => sum + parseFloat(b.potentialReturn), 0);
      const roi = totalWagered > 0 ? ((totalReturns - totalWagered) / totalWagered) * 100 : 0;
      
      const clvBets = bets.filter(b => b.clv !== null);
      const avgClv = clvBets.length > 0
        ? clvBets.reduce((sum, b) => sum + parseFloat(b.clv!), 0) / clvBets.length
        : 0;
      
      res.json({
        user,
        metrics: {
          bankroll: user?.bankroll || "0",
          winRate: winRate.toFixed(1),
          roi: roi.toFixed(1),
          avgClv: avgClv.toFixed(1),
          totalBets: bets.length,
          wins,
          losses,
        },
        pendingSlips,
        week1Progress: {
          betsPlaced: week1Bets.length,
          targetBets: 20,
        },
        latestSnapshot,
      });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch dashboard data" });
    }
  });

  // Prop Comparison routes
  app.get("/api/prop-comparison/:player/:stat", isAuthenticated, async (req, res) => {
    try {
      const { player, stat } = req.params;
      const { propComparisonService } = await import("./services/propComparisonService");
      const comparison = await propComparisonService.comparePropsAcrossPlatforms(player, stat);
      res.json(comparison || { message: "No props found for this player/stat" });
    } catch (error) {
      res.status(500).json({ error: "Failed to compare props" });
    }
  });

  app.get("/api/prop-comparison/player/:playerName", isAuthenticated, async (req, res) => {
    try {
      const { playerName } = req.params;
      const { propComparisonService } = await import("./services/propComparisonService");
      const comparisons = await propComparisonService.getBestLinesForPlayer(playerName);
      res.json(comparisons);
    } catch (error) {
      res.status(500).json({ error: "Failed to get player lines" });
    }
  });

  app.get("/api/prop-comparison/arbitrage", isAuthenticated, async (req, res) => {
    try {
      const { propComparisonService } = await import("./services/propComparisonService");
      const opportunities = await propComparisonService.findArbitrageOpportunities();
      res.json(opportunities);
    } catch (error) {
      res.status(500).json({ error: "Failed to find arbitrage opportunities" });
    }
  });

  // Player Comparison routes
  app.get("/api/player-comparison/:player1/:player2/:sport?", isAuthenticated, async (req, res) => {
    try {
      const { player1, player2, sport } = req.params;
      const selectedSport = (sport || "NBA") as "NBA" | "NHL" | "NFL";
      console.log(`[Player Comparison] Comparing ${player1} vs ${player2} in ${selectedSport}`);
      const { playerComparisonService } = await import("./services/playerComparisonService");
      const comparison = await playerComparisonService.comparePlayers(player1, player2, selectedSport);
      console.log(`[Player Comparison] Successfully compared players`);
      res.json(comparison);
    } catch (error) {
      console.error(`[Player Comparison] Error:`, error);
      res.status(500).json({ error: "Failed to compare players" });
    }
  });

  app.get("/api/player-details/:playerName", isAuthenticated, async (req, res) => {
    try {
      const { playerName } = req.params;
      const { playerComparisonService } = await import("./services/playerComparisonService");
      const details = await playerComparisonService.getPlayerDetails(playerName);
      res.json(details);
    } catch (error) {
      res.status(500).json({ error: "Failed to get player details" });
    }
  });

  // Live Scoreboard routes
  app.get("/api/scoreboard/:sport", isAuthenticated, async (req, res) => {
    try {
      const { sport } = req.params;
      const { liveScoreboardService } = await import("./services/liveScoreboardService");
      const scores = await liveScoreboardService.getLiveScores(sport);
      res.json(scores);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch live scores" });
    }
  });

  app.get("/api/scoreboard", isAuthenticated, async (req, res) => {
    try {
      const { liveScoreboardService } = await import("./services/liveScoreboardService");
      const allScores = await liveScoreboardService.getAllLiveScores();
      res.json(allScores);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch all scores" });
    }
  });

  app.get("/api/scoreboard/live-games/:sport?", isAuthenticated, async (req, res) => {
    try {
      const { sport } = req.params;
      const { liveScoreboardService } = await import("./services/liveScoreboardService");
      const liveGames = await liveScoreboardService.getInProgressGames(sport);
      res.json(liveGames);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch live games" });
    }
  });

  // Line Movement routes
  app.get("/api/line-movements/:propId", isAuthenticated, async (req, res) => {
    try {
      const propId = parseInt(req.params.propId);
      const { lineMovementService } = await import("./services/lineMovementService");
      const movements = await lineMovementService.getPropLineHistory(propId);
      res.json(movements);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch line movements" });
    }
  });

  app.get("/api/line-movements/:propId/analysis", isAuthenticated, async (req, res) => {
    try {
      const propId = parseInt(req.params.propId);
      const { lineMovementService } = await import("./services/lineMovementService");
      const analysis = await lineMovementService.analyzeMovement(propId);
      res.json(analysis);
    } catch (error) {
      res.status(500).json({ error: "Failed to analyze line movement" });
    }
  });

  app.get("/api/line-movements/recent/:minutes", isAuthenticated, async (req, res) => {
    try {
      const minutes = parseInt(req.params.minutes);
      const { lineMovementService } = await import("./services/lineMovementService");
      const movements = await lineMovementService.getRecentMovements(minutes);
      res.json(movements);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch recent movements" });
    }
  });

  // Discord Settings routes
  app.get("/api/discord/settings", isAuthenticated, async (req, res) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: "Unauthorized" });
      }
      
      const settings = await storage.getDiscordSettings(userId);
      res.json(settings || null);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch Discord settings" });
    }
  });

  app.post("/api/discord/settings", isAuthenticated, async (req, res) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: "Unauthorized" });
      }
      
      const { webhookUrl, enabled, notifyNewProps, notifyLineMovements, notifyBetSettlement, minConfidence } = req.body;
      
      const existing = await storage.getDiscordSettings(userId);
      
      if (existing) {
        const updated = await storage.updateDiscordSettings(userId, {
          webhookUrl,
          enabled,
          notifyNewProps,
          notifyLineMovements,
          notifyBetSettlement,
          minConfidence,
        });
        res.json(updated);
      } else {
        const created = await storage.createDiscordSettings({
          userId,
          webhookUrl,
          enabled: enabled ?? true,
          notifyNewProps: notifyNewProps ?? true,
          notifyLineMovements: notifyLineMovements ?? true,
          notifyBetSettlement: notifyBetSettlement ?? true,
          minConfidence: minConfidence ?? 70,
        });
        res.json(created);
      }
    } catch (error) {
      res.status(500).json({ error: "Failed to save Discord settings" });
    }
  });

  app.delete("/api/discord/settings", isAuthenticated, async (req, res) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: "Unauthorized" });
      }
      
      await storage.deleteDiscordSettings(userId);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to delete Discord settings" });
    }
  });

  // Notification routes (requires authentication)
  app.use("/api/notifications", isAuthenticated, createNotificationRoutes(storage));
  
  // Analytics routes (requires authentication)
  app.use("/api/analytics", isAuthenticated, createAnalyticsRoutes(storage));

  // Admin routes (protected by authentication in production)
  app.use("/api/admin", adminRoutes());

  const httpServer = createServer(app);
  return httpServer;
}
