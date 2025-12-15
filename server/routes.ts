import express from "express";
import { storage } from "./storage.js";
import { insertPropSchema, insertSlipSchema, insertBetSchema } from "../shared/schema.js";
import { z } from "zod";
import { requireAuth, getUserId } from "./middleware/auth.js";
import { opticOddsStreamService } from "./services/opticOddsStreamService.js";
import { opticOddsResultsStreamService } from "./services/opticOddsResultsStream.js";

// Normalization helpers
function normalizeSport(s: string): string {
  return s.toUpperCase();
}

function normalizePlatform(p: string): string {
  if (!p) return 'Unknown';
  return p.charAt(0).toUpperCase() + p.slice(1).toLowerCase();
}

// Admin middleware
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
        error: "Admin privileges required for streaming control",
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
    const userId = getUserId(req);
    
    if (!userId) {
      return res.status(401).json({ error: "Not authenticated" });
    }
    
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
    console.error("Dashboard error:", error);
    res.status(500).json({ error: "Failed to fetch dashboard data" });
  }
});

// ==================== PROPS ROUTES ====================
router.get("/props", async (req, res) => {
  try {
    const { sport, limit, offset } = req.query;
    const limitNum = limit ? parseInt(limit as string) : 100; // Default 100 props
    const offsetNum = offset ? parseInt(offset as string) : 0;
    
    // Query DB directly (no longer using OpticOdds cache)
    const { storage } = await import("./storage.js");
    
    let props: any[] = [];
    const normalizedSport = sport && typeof sport === 'string' ? normalizeSport(sport) : undefined;
    
    // Query DB directly
    if (normalizedSport) {
      props = await storage.getActiveProps(normalizedSport);
    } else {
      props = await storage.getAllActiveProps();
    }
    
    // If DB returns 0, log diagnostic info
    if (props.length === 0) {
      console.warn('[PROPS QUERY] No props found in DB', { sport: normalizedSport });
      const { db } = await import("./db.js");
      const { props: propsTable } = await import("../shared/schema.js");
      const { eq } = await import("drizzle-orm");
      
      if (normalizedSport) {
        const unfiltered = await db.select().from(propsTable).where(eq(propsTable.sport, normalizedSport));
        console.log(`[PROPS DEBUG] Total ${normalizedSport} props in DB (unfiltered):`, unfiltered.length);
      } else {
        const total = await db.select().from(propsTable);
        console.log(`[PROPS DEBUG] Total props in DB (unfiltered):`, total.length);
      }
    }
    
    // Structured query log
    const platform = props.length > 0 ? props[0].platform : undefined;
    const activeOnly = true; // Always active props
    const sample = props.slice(0, 3).map(p => ({
      id: p.id,
      player: p.player,
      stat: p.stat,
      line: p.line,
      platform: p.platform,
      gameTime: p.gameTime,
    }));
    
    console.log('[PROPS QUERY]', {
      sport: normalizedSport || 'ALL',
      platform: platform || 'N/A',
      activeOnly,
      count: props.length,
      sample,
    });
    
    // Apply limit and offset
    const paginatedProps = props.slice(offsetNum, offsetNum + limitNum);
    
    console.log(`[API] Returning ${paginatedProps.length} props (${props.length} total, offset: ${offsetNum}, limit: ${limitNum})`);
    res.json(paginatedProps);
  } catch (error) {
    console.error("Error fetching props:", error);
    res.status(500).json({ error: "Failed to fetch props" });
  }
});

router.post("/props", requireAuth, async (req, res) => {
  try {
    const propData = insertPropSchema.parse(req.body);
    const prop = await storage.createProp(propData);
    res.status(201).json(prop);
  } catch (error: any) {
    console.error("Error creating prop:", error);
    res.status(400).json({ error: error.message || "Failed to create prop" });
  }
});

router.delete("/props/:id", requireAuth, async (req, res) => {
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
    const userId = getUserId(req);
    if (!userId) {
      return res.status(401).json({ error: "Not authenticated" });
    }
    const slips = await storage.getSlipsByUser(userId);
    res.json(slips);
  } catch (error) {
    console.error("Error fetching slips:", error);
    res.status(500).json({ error: "Failed to fetch slips" });
  }
});

router.get("/slips/pending", requireAuth, async (req, res) => {
  try {
    const userId = getUserId(req);
    if (!userId) {
      return res.status(401).json({ error: "Not authenticated" });
    }
    const slips = await storage.getPendingSlips(userId);
    res.json(slips);
  } catch (error) {
    console.error("Error fetching pending slips:", error);
    res.status(500).json({ error: "Failed to fetch pending slips" });
  }
});

router.post("/slips", requireAuth, async (req, res) => {
  try {
    const userId = getUserId(req);
    if (!userId) {
      return res.status(401).json({ error: "Not authenticated" });
    }
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

router.patch("/slips/:id/status", requireAuth, async (req, res) => {
  try {
    const userId = getUserId(req);
    if (!userId) {
      return res.status(401).json({ error: "Not authenticated" });
    }
    
    const slipId = parseInt(req.params.id);
    if (isNaN(slipId)) {
      return res.status(400).json({ error: "Invalid slip ID" });
    }
    
    // Verify slip belongs to user
    const slip = await storage.getSlip(slipId);
    if (!slip || slip.userId !== userId) {
      return res.status(403).json({ error: "Forbidden" });
    }
    
    const { status } = updateSlipStatusSchema.parse(req.body);
    const updatedSlip = await storage.updateSlipStatus(slipId, status);
    res.json(updatedSlip);
  } catch (error: any) {
    console.error("Error updating slip status:", error);
    res.status(400).json({ error: error.message || "Failed to update slip status" });
  }
});

// ==================== BETS ROUTES ====================
router.get("/bets", requireAuth, async (req, res) => {
  try {
    const userId = getUserId(req);
    if (!userId) {
      return res.status(401).json({ error: "Not authenticated" });
    }
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
    const userId = getUserId(req);
    if (!userId) {
      return res.status(401).json({ error: "Not authenticated" });
    }
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

router.patch("/bets/:id/settle", requireAuth, async (req, res) => {
  try {
    const userId = getUserId(req);
    if (!userId) {
      return res.status(401).json({ error: "Not authenticated" });
    }
    
    const betId = parseInt(req.params.id);
    if (isNaN(betId)) {
      return res.status(400).json({ error: "Invalid bet ID" });
    }
    
    // Verify bet belongs to user
    const bet = await storage.getBet(betId);
    if (!bet || bet.userId !== userId) {
      return res.status(403).json({ error: "Forbidden" });
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
    const userId = getUserId(req);
    if (!userId) {
      return res.status(401).json({ error: "Not authenticated" });
    }
    const snapshot = await storage.getLatestSnapshot(userId);
    res.json(snapshot);
  } catch (error) {
    console.error("Error fetching latest snapshot:", error);
    res.status(500).json({ error: "Failed to fetch performance data" });
  }
});

router.get("/performance/history", requireAuth, async (req, res) => {
  try {
    const userId = getUserId(req);
    if (!userId) {
      return res.status(401).json({ error: "Not authenticated" });
    }
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

// ==================== SCOREBOARD ROUTES ====================
router.get("/scoreboard", async (req, res) => {
  try {
    const { liveScoreboardService } = await import("./services/liveScoreboardService");
    const scores = await liveScoreboardService.getAllLiveScores();
    res.json(scores);
  } catch (error) {
    console.error("Error fetching scoreboard:", error);
    res.status(500).json({ error: "Failed to fetch scoreboard" });
  }
});

// ==================== PROP COMPARISON ROUTES ====================
router.get("/prop-comparison/player", async (req, res) => {
  try {
    const { player, sport } = req.query;
    
    if (!player || typeof player !== 'string') {
      return res.json([]);
    }

    // Use real prop comparison service to get actual data from database
    const { propComparisonService } = await import("./services/propComparisonService.js");
    const comparisons = await propComparisonService.getBestLinesForPlayer(player);
    
    // Filter by sport if provided (optional filter)
    const filteredComparisons = sport && typeof sport === 'string'
      ? comparisons.filter(c => {
          // Check if any prop for this comparison matches the sport
          // We don't have sport in the comparison directly, so we need to check props
          // For now, return all comparisons since sport filtering would require checking the original props
          return true; // TODO: Add sport filtering if needed by checking original props
        })
      : comparisons;

    res.json(filteredComparisons);
  } catch (error) {
    console.error("Error fetching prop comparison:", error);
    res.status(500).json({ error: "Failed to fetch prop comparison" });
  }
});

// ==================== USER ROUTES ====================
router.get("/user", requireAuth, async (req, res) => {
  try {
    const userId = getUserId(req);
    if (!userId) {
      return res.status(401).json({ error: "Not authenticated" });
    }
    
    const user = await storage.getUser(userId);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }
    
    res.json(user);
  } catch (error) {
    console.error("Error fetching user:", error);
    res.status(500).json({ error: "Failed to fetch user" });
  }
});

// ==================== PLAYER COMPARISON ROUTES ====================
router.get("/player-comparison", async (req, res) => {
  try {
    const { player1, player2, sport } = req.query;
    
    if (!player1 || !player2 || typeof player1 !== 'string' || typeof player2 !== 'string') {
      return res.status(400).json({ error: "player1 and player2 query parameters are required" });
    }
    
    const selectedSport = (sport as string) || "NBA";
    if (!["NBA", "NHL", "NFL"].includes(selectedSport)) {
      return res.status(400).json({ error: "sport must be NBA, NHL, or NFL" });
    }
    
    const { playerComparisonService } = await import("./services/playerComparisonService");
    const comparison = await playerComparisonService.comparePlayers(
      player1,
      player2,
      selectedSport as "NBA" | "NHL" | "NFL"
    );
    
    res.json(comparison);
  } catch (error: any) {
    console.error("Error comparing players:", error);
    res.status(500).json({ error: error.message || "Failed to compare players" });
  }
});

// ==================== PLAYER SEARCH ROUTES ====================
router.get("/players/search", async (req, res) => {
  try {
    const { search, sport } = req.query;
    
    if (!search || typeof search !== 'string' || search.length < 2) {
      return res.json([]);
    }

    const { espnPlayerClient } = await import("./integrations/espnPlayerClient");
    const { balldontlieClient } = await import("./integrations/balldontlieClient");
    const selectedSport = sport && typeof sport === 'string' ? sport : "All";
    
    let results: any[] = [];
    
    if (selectedSport === "All" || selectedSport === "NBA") {
      try {
        const playersResponse = await balldontlieClient.searchPlayers(search);
        // PlayersResponse already contains {data: Player[], meta: {...}}
        const nbaPlayers = (playersResponse.data || []).map((player: any) => ({
          id: player.id.toString(),
          fullName: `${player.first_name} ${player.last_name}`,
          displayName: `${player.first_name} ${player.last_name}`,
          shortName: `${player.first_name.charAt(0)}. ${player.last_name}`,
          team: { 
            name: player.team.full_name || `${player.team.city} ${player.team.name}`,
            abbreviation: player.team.abbreviation 
          },
          position: player.position ? { abbreviation: player.position } : { abbreviation: "N/A" },
          sport: "NBA"
        }));
        results.push(...nbaPlayers);
      } catch (error) {
        console.error("Error fetching NBA players from BallDontLie:", error);
      }
    }
    
    if (selectedSport === "All" || selectedSport === "NHL") {
      const nhlPlayers = await espnPlayerClient.searchNHLPlayers(search);
      results.push(...nhlPlayers.map((p: any) => ({ ...p, sport: "NHL" })));
    }
    
    if (selectedSport === "All" || selectedSport === "NFL") {
      const nflPlayers = await espnPlayerClient.searchNFLPlayers(search);
      results.push(...nflPlayers.map((p: any) => ({ ...p, sport: "NFL" })));
    }
    
    if (selectedSport === "All" || selectedSport === "MLB") {
      // MLB search would be added here when available
      // For now, skip MLB
    }
    
    res.json(results.slice(0, 20));
  } catch (error) {
    console.error("Error searching players:", error);
    res.status(500).json({ error: "Failed to search players" });
  }
});

// ==================== STREAMING CONTROL ROUTES (ADMIN ONLY) ====================
// Start streaming live odds from PrizePicks/Underdog
router.post("/streaming/odds/start", requireAdmin, async (req, res) => {
  try {
    const { sport, sportsbooks, leagues, markets, isMain } = req.body;
    
    if (!sport) {
      return res.status(400).json({ error: "sport is required" });
    }
    
    if (!sportsbooks || !Array.isArray(sportsbooks) || sportsbooks.length === 0) {
      return res.status(400).json({ error: "sportsbooks array is required" });
    }
    
    const streamId = opticOddsStreamService.startOddsStream({
      sport,
      sportsbooks,
      leagues,
      markets,
      isMain,
    });
    
    res.json({
      success: true,
      streamId,
      message: `Started streaming ${sport} odds from ${sportsbooks.join(', ')}`,
    });
  } catch (error) {
    console.error("Error starting odds stream:", error);
    res.status(500).json({ error: "Failed to start odds stream" });
  }
});

// Stop specific odds stream
router.post("/streaming/odds/stop/:streamId", requireAdmin, async (req, res) => {
  try {
    const { streamId } = req.params;
    const stopped = opticOddsStreamService.stopStream(streamId);
    
    if (stopped) {
      res.json({ success: true, message: `Stopped stream ${streamId}` });
    } else {
      res.status(404).json({ error: "Stream not found" });
    }
  } catch (error) {
    console.error("Error stopping odds stream:", error);
    res.status(500).json({ error: "Failed to stop odds stream" });
  }
});

// Get active odds streams
router.get("/streaming/odds/active", requireAdmin, async (req, res) => {
  try {
    const activeStreams = opticOddsStreamService.getActiveStreams();
    res.json({ streams: activeStreams });
  } catch (error) {
    console.error("Error getting active streams:", error);
    res.status(500).json({ error: "Failed to get active streams" });
  }
});

// Start streaming live game results
router.post("/streaming/results/start", requireAdmin, async (req, res) => {
  try {
    const { sport, leagues } = req.body;
    
    if (!sport) {
      return res.status(400).json({ error: "sport is required" });
    }
    
    const streamId = opticOddsResultsStreamService.startResultsStream({
      sport,
      leagues,
    });
    
    res.json({
      success: true,
      streamId,
      message: `Started streaming ${sport} results`,
    });
  } catch (error) {
    console.error("Error starting results stream:", error);
    res.status(500).json({ error: "Failed to start results stream" });
  }
});

// Stop specific results stream
router.post("/streaming/results/stop/:streamId", requireAdmin, async (req, res) => {
  try {
    const { streamId } = req.params;
    const stopped = opticOddsResultsStreamService.stopStream(streamId);
    
    if (stopped) {
      res.json({ success: true, message: `Stopped results stream ${streamId}` });
    } else {
      res.status(404).json({ error: "Results stream not found" });
    }
  } catch (error) {
    console.error("Error stopping results stream:", error);
    res.status(500).json({ error: "Failed to stop results stream" });
  }
});

// Get active results streams
router.get("/streaming/results/active", requireAdmin, async (req, res) => {
  try {
    const activeStreams = opticOddsResultsStreamService.getActiveStreams();
    res.json({ streams: activeStreams });
  } catch (error) {
    console.error("Error getting active results streams:", error);
    res.status(500).json({ error: "Failed to get active results streams" });
  }
});

// ==================== DEBUG ROUTES ====================
router.get("/debug/props", async (req, res) => {
  try {
    const { sport, platform } = req.query;
    
    if (!sport || !platform) {
      return res.status(400).json({ 
        error: "sport and platform query parameters are required",
        example: "/api/debug/props?sport=NBA&platform=PrizePicks"
      });
    }

    const { propCacheService } = await import("./services/propCacheService.js");
    const { fileCache } = await import("./utils/fileCache.js");
    
    const key = `${sport}_${platform}`;
    const filePath = fileCache.getCacheFilePath('props', key);
    
    // Try to read raw cache - handle corruption gracefully
    const fs = await import('fs/promises');
    let rawContent: string | null = null;
    let cacheEntry: any = null;
    let parseError: string | null = null;
    let fileExists = false;
    
    try {
      await fs.access(filePath);
      fileExists = true;
      try {
        const content = await fs.readFile(filePath, 'utf-8');
        rawContent = content;
        if (content && content.trim().length > 0) {
          cacheEntry = JSON.parse(content);
        } else {
          parseError = "File is empty";
        }
      } catch (parseErr) {
        parseError = parseErr instanceof Error ? parseErr.message : String(parseErr);
        // File exists but is corrupted - still return info
      }
    } catch {
      // File doesn't exist
      fileExists = false;
    }

    // Get props count (this will handle corruption internally)
    const props = await propCacheService.getProps(sport as string, platform as string);
    const propsCount = Array.isArray(props) ? props.length : 0;
    const isStale = typeof props === 'object' && 'stale' in props && props.stale;

    // Calculate TTL remaining
    let ttlRemaining = 0;
    let lastUpdated: string | null = null;
    let age = 0;
    if (cacheEntry && cacheEntry.cachedAt) {
      lastUpdated = cacheEntry.cachedAt;
      const cachedAt = new Date(cacheEntry.cachedAt).getTime();
      age = Date.now() - cachedAt;
      const ageSeconds = age / 1000;
      ttlRemaining = Math.max(0, (cacheEntry.ttl || 0) - ageSeconds);
    }

    res.json({
      sport,
      platform,
      propsCount,
      isStale,
      lastUpdated,
      age: Math.round(age / 1000),
      ttlRemaining: Math.round(ttlRemaining),
      ttlRemainingFormatted: `${Math.round(ttlRemaining / 60)}m ${Math.round(ttlRemaining % 60)}s`,
      filePath,
      fileExists,
      parseError,
      rawCache: cacheEntry ? {
        cachedAt: cacheEntry.cachedAt,
        ttl: cacheEntry.ttl,
        corrupted: cacheEntry.corrupted || false,
        lastRefreshFailed: cacheEntry.lastRefreshFailed || false,
        error: cacheEntry.error || null,
        warning: cacheEntry.warning || null,
        metadata: cacheEntry.metadata || null,
        repairedAt: cacheEntry.repairedAt || null,
      } : null,
    });
  } catch (error) {
    console.error("Error in debug/props:", error);
    res.status(500).json({ error: "Failed to fetch debug info", details: error instanceof Error ? error.message : String(error) });
  }
});

router.get("/api/debug/props", async (req, res) => {
  try {
    const { storage } = await import("./storage.js");
    const { db } = await import("./db.js");
    const { props } = await import("../shared/schema.js");
    const { sql, eq, and, gte } = await import("drizzle-orm");
    
    // Get raw counts from DB
    const totalProps = await db.select().from(props);
    const activeProps = await db.select().from(props).where(eq(props.isActive, true));
    const now = new Date();
    const futureProps = await db.select().from(props).where(and(
      eq(props.isActive, true),
      gte(props.gameTime, now)
    ));
    const withValidOpponent = await db.select().from(props).where(and(
      eq(props.isActive, true),
      sql`(${props.opponent} IS NOT NULL AND LOWER(${props.opponent}) != 'tbd')`
    ));
    
    // Count by sport
    const sportCounts: Record<string, { total: number; active: number; future: number }> = {};
    for (const prop of totalProps) {
      const sport = prop.sport || 'Unknown';
      if (!sportCounts[sport]) {
        sportCounts[sport] = { total: 0, active: 0, future: 0 };
      }
      sportCounts[sport].total++;
      if (prop.isActive) {
        sportCounts[sport].active++;
      }
      if (prop.isActive && prop.gameTime && new Date(prop.gameTime) >= now) {
        sportCounts[sport].future++;
      }
    }
    
    // Count by platform
    const platformCounts: Record<string, number> = {};
    for (const prop of activeProps) {
      const platform = normalizePlatform(prop.platform || 'Unknown');
      platformCounts[platform] = (platformCounts[platform] || 0) + 1;
    }
    
    // Find most recent prop
    const mostRecent = activeProps.length > 0 
      ? activeProps.reduce((latest, prop) => {
          const propTime = prop.gameTime ? new Date(prop.gameTime).getTime() : 0;
          const latestTime = latest.gameTime ? new Date(latest.gameTime).getTime() : 0;
          return propTime > latestTime ? prop : latest;
        })
      : null;
    
    // Sample props to show what's in DB
    const sampleProps = activeProps.slice(0, 5).map(p => ({
      id: p.id,
      sport: p.sport,
      player: p.player,
      stat: p.stat,
      platform: p.platform,
      gameTime: p.gameTime,
      opponent: p.opponent,
      isActive: p.isActive,
      gameTimeInFuture: p.gameTime ? new Date(p.gameTime) >= now : false,
    }));
    
    res.json({
      summary: {
        totalProps: totalProps.length,
        activeProps: activeProps.length,
        futureProps: futureProps.length,
        withValidOpponent: withValidOpponent.length,
        now: now.toISOString(),
      },
      bySport: sportCounts,
      byPlatform: platformCounts,
      mostRecentProp: mostRecent ? {
        id: mostRecent.id,
        player: mostRecent.player,
        stat: mostRecent.stat,
        platform: mostRecent.platform,
        sport: mostRecent.sport,
        gameTime: mostRecent.gameTime,
        opponent: mostRecent.opponent,
        gameTimeInFuture: mostRecent.gameTime ? new Date(mostRecent.gameTime) >= now : false,
      } : null,
      sampleProps,
    });
  } catch (error) {
    console.error("Error in /api/debug/props:", error);
    res.status(500).json({ 
      error: "Failed to fetch debug info", 
      details: error instanceof Error ? error.message : String(error) 
    });
  }
});

router.get("/debug/cache", async (req, res) => {
  try {
    const { propCacheService } = await import("./services/propCacheService.js");
    const cacheInfo = await propCacheService.getCacheInfo();
    
    res.json({
      summary: {
        total: cacheInfo.total,
        corrupted: cacheInfo.corrupted,
        stale: cacheInfo.stale,
        healthy: cacheInfo.total - cacheInfo.corrupted - cacheInfo.stale,
      },
      files: cacheInfo.files,
    });
  } catch (error) {
    console.error("Error in debug/cache:", error);
    res.status(500).json({ error: "Failed to fetch cache info", details: error instanceof Error ? error.message : String(error) });
  }
});

router.post("/debug/refresh-all", async (req, res) => {
  try {
    const { propRefreshService } = await import("./services/propRefreshService.js");
    
    // Trigger refresh in background (don't wait for completion)
    const refreshPromise = propRefreshService.refreshAllPlatforms(['NBA', 'NFL', 'NHL']);
    
    // Don't await - return immediately
    refreshPromise.catch(error => {
      console.error("[DEBUG REFRESH] Background refresh error:", error);
    });

    res.json({
      started: true,
      servicesTriggered: ['PrizePicks', 'Underdog', 'The Odds API', 'OpticOdds'],
      sports: ['NBA', 'NFL', 'NHL'],
      message: "Refresh started in background. Check logs for progress.",
    });
  } catch (error) {
    console.error("Error starting refresh:", error);
    res.status(500).json({ 
      error: "Failed to start refresh", 
      details: error instanceof Error ? error.message : String(error) 
    });
  }
});

export default router;
