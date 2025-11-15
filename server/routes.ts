import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertPropSchema, insertSlipSchema, insertBetSchema } from "@shared/schema";
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

export async function registerRoutes(app: Express): Promise<Server> {
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
      const props = await storage.getActiveProps(validatedQuery.sport);
      res.json(props);
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({ error: "Invalid query parameters", details: error.errors });
      }
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
      
      // ML-powered analysis simulation
      // In production, this would call the ML model
      const baseConfidence = Math.floor(Math.random() * 30) + 55; // 55-85 range
      const lineFactor = parseFloat(validatedData.line);
      
      // Adjust confidence based on sport, stat type, and line value
      let confidenceAdjustment = 0;
      if (validatedData.sport === "NHL" && validatedData.stat === "SOG") {
        confidenceAdjustment = 5;
        // Lower lines are easier to hit for overs, harder for unders
        if (validatedData.direction === "over" && lineFactor < 4) {
          confidenceAdjustment += 3;
        } else if (validatedData.direction === "under" && lineFactor > 5) {
          confidenceAdjustment += 2;
        }
      } else if (validatedData.sport === "NBA" && validatedData.stat === "Points") {
        confidenceAdjustment = 3;
        if (validatedData.direction === "over" && lineFactor < 20) {
          confidenceAdjustment += 2;
        }
      } else if (validatedData.stat === "Goals" || validatedData.stat === "Assists") {
        // Goals and assists are harder to predict
        confidenceAdjustment = -2;
      }
      
      const confidence = Math.min(95, Math.max(45, baseConfidence + confidenceAdjustment));
      
      // Calculate EV (Expected Value) based on confidence and implied probability
      const modelProbability = confidence / 100;
      // Platform odds vary, but typically around 1.8-2.0 for props
      const platformOdds = 1.9;
      const impliedProbability = 1 / platformOdds;
      
      // EV = (Model Probability × Payout) - (1 - Model Probability)
      // Simplified: EV% = ((Model Prob - Implied Prob) / Implied Prob) × 100
      const ev = ((modelProbability - impliedProbability) / impliedProbability) * 100;
      
      res.json({
        confidence,
        ev: parseFloat(ev.toFixed(2)),
        modelProbability: parseFloat(modelProbability.toFixed(4)),
        sport: validatedData.sport,
        player: validatedData.player,
        team: validatedData.team,
        opponent: validatedData.opponent,
        stat: validatedData.stat,
        line: validatedData.line,
        direction: validatedData.direction,
        platform: validatedData.platform,
      });
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({ error: "Invalid prop data", details: error.errors });
      }
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
      if (error instanceof ZodError) {
        return res.status(400).json({ error: "Invalid request", details: error.errors });
      }
      res.status(500).json({ error: "Failed to fetch bets" });
    }
  });

  app.post("/api/bets", async (req, res) => {
    try {
      const validatedBet = insertBetSchema.parse(req.body);
      
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
      
      const bet = await storage.updateBetStatus(
        betId,
        validatedBody.status,
        validatedBody.closingLine,
        validatedBody.clv
      );
      
      if (!bet) {
        return res.status(404).json({ error: "Bet not found" });
      }
      
      // Update bankroll if won
      if (validatedBody.status === "won") {
        const user = await storage.getUser(bet.userId);
        if (!user) {
          return res.status(404).json({ error: "User not found" });
        }
        
        const currentBankroll = parseFloat(user.bankroll);
        const returnAmount = parseFloat(bet.potentialReturn);
        const newBankroll = (currentBankroll + returnAmount).toFixed(2);
        await storage.updateBankroll(bet.userId, newBankroll);
      }
      
      res.json(bet);
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({ error: "Invalid request", details: error.errors });
      }
      res.status(500).json({ error: "Failed to settle bet" });
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

  const httpServer = createServer(app);
  return httpServer;
}
