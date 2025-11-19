import express from "express";
import { storage } from "./storage.js";
import { insertPropSchema, insertSlipSchema, insertBetSchema } from "../shared/schema.js";
import { z } from "zod";
import { requireAuth } from "./middleware/auth.js";

const router = express.Router();

// Health check
router.get("/", (req, res) => {
  res.json({
    ok: true,
    message: "API running",
    timestamp: Date.now(),
  });
});

// ==================== DASHBOARD ROUTE ====================
router.get("/dashboard", requireAuth, async (req, res) => {
  try {
    const userId = req.session!.userId!;
    
    // Get user data
    const user = await storage.getUser(userId);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }
    
    // Get user's bets for stats
    const bets = await storage.getBetsWithProps(userId);
    const settledBets = bets.filter((b: any) => b.status === 'won' || b.status === 'lost');
    const wonBets = settledBets.filter((b: any) => b.status === 'won');
    
    // Calculate stats
    const totalBets = settledBets.length;
    const winRate = totalBets > 0 ? (wonBets.length / totalBets) * 100 : 0;
    const totalWagered = settledBets.reduce((sum: number, b: any) => sum + b.amount, 0);
    const totalProfit = settledBets.reduce((sum: number, b: any) => {
      if (b.status === 'won') return sum + (b.payout - b.amount);
      if (b.status === 'lost') return sum - b.amount;
      return sum;
    }, 0);
    const roi = totalWagered > 0 ? (totalProfit / totalWagered) * 100 : 0;
    
    // Get pending slips
    const slips = await storage.getPendingSlips(userId);
    
    res.json({
      user,
      stats: {
        totalBets,
        winRate,
        roi,
        totalProfit,
        bankroll: user.bankroll,
      },
      pendingSlips: slips,
    });
  } catch (error) {
    console.error("Error fetching dashboard:", error);
    res.status(500).json({ error: "Failed to fetch dashboard data" });
  }
});

// ==================== PROPS ROUTES ====================
router.get("/props", async (req, res) => {
  try {
    const { sport } = req.query;
    const props = await storage.getActivePropsWithLineMovement(sport as string);
    res.json(props);
  } catch (error) {
    console.error("Error fetching props:", error);
    res.status(500).json({ error: "Failed to fetch props" });
  }
});

router.post("/props", async (req, res) => {
  try {
    const propData = insertPropSchema.parse(req.body);
    const prop = await storage.createProp(propData);
    res.status(201).json(prop);
  } catch (error: any) {
    console.error("Error creating prop:", error);
    res.status(400).json({ error: error.message || "Failed to create prop" });
  }
});

router.delete("/props/:id", async (req, res) => {
  try {
    const propId = parseInt(req.params.id);
    await storage.deactivateProp(propId);
    res.json({ success: true });
  } catch (error) {
    console.error("Error deactivating prop:", error);
    res.status(500).json({ error: "Failed to deactivate prop" });
  }
});

// ==================== SLIPS ROUTES ====================
router.get("/slips", requireAuth, async (req, res) => {
  try {
    const userId = req.session!.userId!;
    const slips = await storage.getSlipsByUser(userId);
    res.json(slips);
  } catch (error) {
    console.error("Error fetching slips:", error);
    res.status(500).json({ error: "Failed to fetch slips" });
  }
});

router.get("/slips/pending", requireAuth, async (req, res) => {
  try {
    const userId = req.session!.userId!;
    const slips = await storage.getPendingSlips(userId);
    res.json(slips);
  } catch (error) {
    console.error("Error fetching pending slips:", error);
    res.status(500).json({ error: "Failed to fetch pending slips" });
  }
});

router.post("/slips", requireAuth, async (req, res) => {
  try {
    const userId = req.session!.userId!;
    const slipData = insertSlipSchema.parse({ ...req.body, userId });
    const slip = await storage.createSlip(slipData);
    res.status(201).json(slip);
  } catch (error: any) {
    console.error("Error creating slip:", error);
    res.status(400).json({ error: error.message || "Failed to create slip" });
  }
});

const updateSlipStatusSchema = z.object({
  status: z.enum(["pending", "placed", "won", "lost", "pushed"]),
});

router.patch("/slips/:id/status", async (req, res) => {
  try {
    const slipId = parseInt(req.params.id);
    if (isNaN(slipId)) {
      return res.status(400).json({ error: "Invalid slip ID" });
    }
    const { status } = updateSlipStatusSchema.parse(req.body);
    const slip = await storage.updateSlipStatus(slipId, status);
    res.json(slip);
  } catch (error: any) {
    console.error("Error updating slip status:", error);
    res.status(400).json({ error: error.message || "Failed to update slip status" });
  }
});

// ==================== BETS ROUTES ====================
router.get("/bets", requireAuth, async (req, res) => {
  try {
    const userId = req.session!.userId!;
    const bets = await storage.getBetsWithProps(userId);
    res.json(bets);
  } catch (error) {
    console.error("Error fetching bets:", error);
    res.status(500).json({ error: "Failed to fetch bets" });
  }
});

router.get("/bets/:id", async (req, res) => {
  try {
    const betId = parseInt(req.params.id);
    const bet = await storage.getBet(betId);
    if (!bet) {
      return res.status(404).json({ error: "Bet not found" });
    }
    res.json(bet);
  } catch (error) {
    console.error("Error fetching bet:", error);
    res.status(500).json({ error: "Failed to fetch bet" });
  }
});

router.post("/bets", requireAuth, async (req, res) => {
  try {
    const userId = req.session!.userId!;
    const betData = insertBetSchema.parse({ ...req.body, userId });
    const result = await storage.placeBetWithBankrollCheck(betData);
    
    if (!result.success) {
      return res.status(400).json({ error: result.error });
    }
    
    res.status(201).json(result.bet);
  } catch (error: any) {
    console.error("Error placing bet:", error);
    res.status(400).json({ error: error.message || "Failed to place bet" });
  }
});

const settleBetSchema = z.object({
  outcome: z.enum(["won", "lost", "pushed"]),
  closingLine: z.string().optional(),
  clv: z.string().optional(),
});

router.patch("/bets/:id/settle", async (req, res) => {
  try {
    const betId = parseInt(req.params.id);
    if (isNaN(betId)) {
      return res.status(400).json({ error: "Invalid bet ID" });
    }
    const { outcome, closingLine, clv } = settleBetSchema.parse(req.body);
    
    const result = await storage.settleBetWithBankrollUpdate(betId, outcome, closingLine, clv);
    
    if (!result.success) {
      return res.status(400).json({ error: result.error });
    }
    
    res.json({
      bet: result.bet,
      bankrollChange: result.bankrollChange,
    });
  } catch (error: any) {
    console.error("Error settling bet:", error);
    res.status(400).json({ error: error.message || "Failed to settle bet" });
  }
});

// ==================== PERFORMANCE ROUTES ====================
router.get("/performance/latest", requireAuth, async (req, res) => {
  try {
    const userId = req.session!.userId!;
    const snapshot = await storage.getLatestSnapshot(userId);
    res.json(snapshot);
  } catch (error) {
    console.error("Error fetching latest snapshot:", error);
    res.status(500).json({ error: "Failed to fetch performance data" });
  }
});

router.get("/performance/history", requireAuth, async (req, res) => {
  try {
    const userId = req.session!.userId!;
    const days = parseInt(req.query.days as string) || 30;
    const history = await storage.getSnapshotHistory(userId, days);
    res.json(history);
  } catch (error) {
    console.error("Error fetching performance history:", error);
    res.status(500).json({ error: "Failed to fetch performance history" });
  }
});

// ==================== GAME EVENTS ROUTES ====================
router.get("/games/pending", async (req, res) => {
  try {
    const { sport } = req.query;
    const games = await storage.getPendingGames(sport as string);
    res.json(games);
  } catch (error) {
    console.error("Error fetching pending games:", error);
    res.status(500).json({ error: "Failed to fetch pending games" });
  }
});

router.get("/games/:id", async (req, res) => {
  try {
    const gameId = req.params.id;
    const game = await storage.getGameEvent(gameId);
    if (!game) {
      return res.status(404).json({ error: "Game not found" });
    }
    res.json(game);
  } catch (error) {
    console.error("Error fetching game:", error);
    res.status(500).json({ error: "Failed to fetch game" });
  }
});

// ==================== LINE MOVEMENTS ROUTES ====================
router.get("/line-movements", async (req, res) => {
  try {
    const { propId } = req.query;
    if (!propId) {
      return res.status(400).json({ error: "propId is required" });
    }
    const movements = await storage.getLineMovements(parseInt(propId as string));
    res.json(movements);
  } catch (error) {
    console.error("Error fetching line movements:", error);
    res.status(500).json({ error: "Failed to fetch line movements" });
  }
});

router.get("/line-movements/recent", async (req, res) => {
  try {
    const hours = parseInt(req.query.hours as string) || 24;
    const movements = await storage.getRecentLineMovements(hours);
    res.json(movements);
  } catch (error) {
    console.error("Error fetching recent line movements:", error);
    res.status(500).json({ error: "Failed to fetch recent line movements" });
  }
});

export default router;
