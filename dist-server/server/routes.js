var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
import express from "express";
import { storage } from "./storage.js";
import { insertPropSchema, insertSlipSchema, insertBetSchema } from "../shared/schema.js";
import { z } from "zod";
import { requireAuth } from "./middleware/auth.js";
var router = express.Router();
// Health check
router.get("/", function (req, res) {
    res.json({
        ok: true,
        message: "API running",
        timestamp: Date.now(),
    });
});
// ==================== DASHBOARD ROUTE ====================
router.get("/dashboard", requireAuth, function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var userId, user, bets, settledBets, wonBets, totalBets, winRate, totalWagered, totalProfit, roi, slips, error_1;
    var _a, _b, _c;
    return __generator(this, function (_d) {
        switch (_d.label) {
            case 0:
                _d.trys.push([0, 4, , 5]);
                userId = (_c = (_b = (_a = req.session) === null || _a === void 0 ? void 0 : _a.user) === null || _b === void 0 ? void 0 : _b.claims) === null || _c === void 0 ? void 0 : _c.sub;
                return [4 /*yield*/, storage.getUser(userId)];
            case 1:
                user = _d.sent();
                if (!user) {
                    return [2 /*return*/, res.status(404).json({ error: "User not found" })];
                }
                return [4 /*yield*/, storage.getBetsWithProps(userId)];
            case 2:
                bets = _d.sent();
                settledBets = bets.filter(function (b) { return b.status === 'won' || b.status === 'lost'; });
                wonBets = settledBets.filter(function (b) { return b.status === 'won'; });
                totalBets = settledBets.length;
                winRate = totalBets > 0 ? (wonBets.length / totalBets) * 100 : 0;
                totalWagered = settledBets.reduce(function (sum, b) { return sum + b.amount; }, 0);
                totalProfit = settledBets.reduce(function (sum, b) {
                    if (b.status === 'won')
                        return sum + (b.payout - b.amount);
                    if (b.status === 'lost')
                        return sum - b.amount;
                    return sum;
                }, 0);
                roi = totalWagered > 0 ? (totalProfit / totalWagered) * 100 : 0;
                return [4 /*yield*/, storage.getPendingSlips(userId)];
            case 3:
                slips = _d.sent();
                res.json({
                    user: user,
                    stats: {
                        totalBets: totalBets,
                        winRate: winRate,
                        roi: roi,
                        totalProfit: totalProfit,
                        bankroll: user.bankroll,
                    },
                    pendingSlips: slips,
                });
                return [3 /*break*/, 5];
            case 4:
                error_1 = _d.sent();
                console.error("Error fetching dashboard:", error_1);
                res.status(500).json({ error: "Failed to fetch dashboard data" });
                return [3 /*break*/, 5];
            case 5: return [2 /*return*/];
        }
    });
}); });
// ==================== PROPS ROUTES ====================
router.get("/props", function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var sport, props, error_2;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                _a.trys.push([0, 2, , 3]);
                sport = req.query.sport;
                return [4 /*yield*/, storage.getActivePropsWithLineMovement(sport)];
            case 1:
                props = _a.sent();
                res.json(props);
                return [3 /*break*/, 3];
            case 2:
                error_2 = _a.sent();
                console.error("Error fetching props:", error_2);
                res.status(500).json({ error: "Failed to fetch props" });
                return [3 /*break*/, 3];
            case 3: return [2 /*return*/];
        }
    });
}); });
router.post("/props", function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var propData, prop, error_3;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                _a.trys.push([0, 2, , 3]);
                propData = insertPropSchema.parse(req.body);
                return [4 /*yield*/, storage.createProp(propData)];
            case 1:
                prop = _a.sent();
                res.status(201).json(prop);
                return [3 /*break*/, 3];
            case 2:
                error_3 = _a.sent();
                console.error("Error creating prop:", error_3);
                res.status(400).json({ error: error_3.message || "Failed to create prop" });
                return [3 /*break*/, 3];
            case 3: return [2 /*return*/];
        }
    });
}); });
router.delete("/props/:id", function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var propId, error_4;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                _a.trys.push([0, 2, , 3]);
                propId = parseInt(req.params.id);
                return [4 /*yield*/, storage.deactivateProp(propId)];
            case 1:
                _a.sent();
                res.json({ success: true });
                return [3 /*break*/, 3];
            case 2:
                error_4 = _a.sent();
                console.error("Error deactivating prop:", error_4);
                res.status(500).json({ error: "Failed to deactivate prop" });
                return [3 /*break*/, 3];
            case 3: return [2 /*return*/];
        }
    });
}); });
// ==================== SLIPS ROUTES ====================
router.get("/slips", requireAuth, function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var userId, slips, error_5;
    var _a, _b, _c;
    return __generator(this, function (_d) {
        switch (_d.label) {
            case 0:
                _d.trys.push([0, 2, , 3]);
                userId = (_c = (_b = (_a = req.session) === null || _a === void 0 ? void 0 : _a.user) === null || _b === void 0 ? void 0 : _b.claims) === null || _c === void 0 ? void 0 : _c.sub;
                return [4 /*yield*/, storage.getSlipsByUser(userId)];
            case 1:
                slips = _d.sent();
                res.json(slips);
                return [3 /*break*/, 3];
            case 2:
                error_5 = _d.sent();
                console.error("Error fetching slips:", error_5);
                res.status(500).json({ error: "Failed to fetch slips" });
                return [3 /*break*/, 3];
            case 3: return [2 /*return*/];
        }
    });
}); });
router.get("/slips/pending", requireAuth, function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var userId, slips, error_6;
    var _a, _b, _c;
    return __generator(this, function (_d) {
        switch (_d.label) {
            case 0:
                _d.trys.push([0, 2, , 3]);
                userId = (_c = (_b = (_a = req.session) === null || _a === void 0 ? void 0 : _a.user) === null || _b === void 0 ? void 0 : _b.claims) === null || _c === void 0 ? void 0 : _c.sub;
                return [4 /*yield*/, storage.getPendingSlips(userId)];
            case 1:
                slips = _d.sent();
                res.json(slips);
                return [3 /*break*/, 3];
            case 2:
                error_6 = _d.sent();
                console.error("Error fetching pending slips:", error_6);
                res.status(500).json({ error: "Failed to fetch pending slips" });
                return [3 /*break*/, 3];
            case 3: return [2 /*return*/];
        }
    });
}); });
router.post("/slips", requireAuth, function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var userId, slipData, slip, error_7;
    var _a, _b, _c;
    return __generator(this, function (_d) {
        switch (_d.label) {
            case 0:
                _d.trys.push([0, 2, , 3]);
                userId = (_c = (_b = (_a = req.session) === null || _a === void 0 ? void 0 : _a.user) === null || _b === void 0 ? void 0 : _b.claims) === null || _c === void 0 ? void 0 : _c.sub;
                slipData = insertSlipSchema.parse(__assign(__assign({}, req.body), { userId: userId }));
                return [4 /*yield*/, storage.createSlip(slipData)];
            case 1:
                slip = _d.sent();
                res.status(201).json(slip);
                return [3 /*break*/, 3];
            case 2:
                error_7 = _d.sent();
                console.error("Error creating slip:", error_7);
                res.status(400).json({ error: error_7.message || "Failed to create slip" });
                return [3 /*break*/, 3];
            case 3: return [2 /*return*/];
        }
    });
}); });
var updateSlipStatusSchema = z.object({
    status: z.enum(["pending", "placed", "won", "lost", "pushed"]),
});
router.patch("/slips/:id/status", function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var slipId, status, slip, error_8;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                _a.trys.push([0, 2, , 3]);
                slipId = parseInt(req.params.id);
                if (isNaN(slipId)) {
                    return [2 /*return*/, res.status(400).json({ error: "Invalid slip ID" })];
                }
                status = updateSlipStatusSchema.parse(req.body).status;
                return [4 /*yield*/, storage.updateSlipStatus(slipId, status)];
            case 1:
                slip = _a.sent();
                res.json(slip);
                return [3 /*break*/, 3];
            case 2:
                error_8 = _a.sent();
                console.error("Error updating slip status:", error_8);
                res.status(400).json({ error: error_8.message || "Failed to update slip status" });
                return [3 /*break*/, 3];
            case 3: return [2 /*return*/];
        }
    });
}); });
// ==================== BETS ROUTES ====================
router.get("/bets", requireAuth, function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var userId, bets, error_9;
    var _a, _b, _c;
    return __generator(this, function (_d) {
        switch (_d.label) {
            case 0:
                _d.trys.push([0, 2, , 3]);
                userId = (_c = (_b = (_a = req.session) === null || _a === void 0 ? void 0 : _a.user) === null || _b === void 0 ? void 0 : _b.claims) === null || _c === void 0 ? void 0 : _c.sub;
                return [4 /*yield*/, storage.getBetsWithProps(userId)];
            case 1:
                bets = _d.sent();
                res.json(bets);
                return [3 /*break*/, 3];
            case 2:
                error_9 = _d.sent();
                console.error("Error fetching bets:", error_9);
                res.status(500).json({ error: "Failed to fetch bets" });
                return [3 /*break*/, 3];
            case 3: return [2 /*return*/];
        }
    });
}); });
router.get("/bets/:id", function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var betId, bet, error_10;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                _a.trys.push([0, 2, , 3]);
                betId = parseInt(req.params.id);
                return [4 /*yield*/, storage.getBet(betId)];
            case 1:
                bet = _a.sent();
                if (!bet) {
                    return [2 /*return*/, res.status(404).json({ error: "Bet not found" })];
                }
                res.json(bet);
                return [3 /*break*/, 3];
            case 2:
                error_10 = _a.sent();
                console.error("Error fetching bet:", error_10);
                res.status(500).json({ error: "Failed to fetch bet" });
                return [3 /*break*/, 3];
            case 3: return [2 /*return*/];
        }
    });
}); });
router.post("/bets", requireAuth, function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var userId, betData, result, error_11;
    var _a, _b, _c;
    return __generator(this, function (_d) {
        switch (_d.label) {
            case 0:
                _d.trys.push([0, 2, , 3]);
                userId = (_c = (_b = (_a = req.session) === null || _a === void 0 ? void 0 : _a.user) === null || _b === void 0 ? void 0 : _b.claims) === null || _c === void 0 ? void 0 : _c.sub;
                betData = insertBetSchema.parse(__assign(__assign({}, req.body), { userId: userId }));
                return [4 /*yield*/, storage.placeBetWithBankrollCheck(betData)];
            case 1:
                result = _d.sent();
                if (!result.success) {
                    return [2 /*return*/, res.status(400).json({ error: result.error })];
                }
                res.status(201).json(result.bet);
                return [3 /*break*/, 3];
            case 2:
                error_11 = _d.sent();
                console.error("Error placing bet:", error_11);
                res.status(400).json({ error: error_11.message || "Failed to place bet" });
                return [3 /*break*/, 3];
            case 3: return [2 /*return*/];
        }
    });
}); });
var settleBetSchema = z.object({
    outcome: z.enum(["won", "lost", "pushed"]),
    closingLine: z.string().optional(),
    clv: z.string().optional(),
});
router.patch("/bets/:id/settle", function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var betId, _a, outcome, closingLine, clv, result, error_12;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0:
                _b.trys.push([0, 2, , 3]);
                betId = parseInt(req.params.id);
                if (isNaN(betId)) {
                    return [2 /*return*/, res.status(400).json({ error: "Invalid bet ID" })];
                }
                _a = settleBetSchema.parse(req.body), outcome = _a.outcome, closingLine = _a.closingLine, clv = _a.clv;
                return [4 /*yield*/, storage.settleBetWithBankrollUpdate(betId, outcome, closingLine, clv)];
            case 1:
                result = _b.sent();
                if (!result.success) {
                    return [2 /*return*/, res.status(400).json({ error: result.error })];
                }
                res.json({
                    bet: result.bet,
                    bankrollChange: result.bankrollChange,
                });
                return [3 /*break*/, 3];
            case 2:
                error_12 = _b.sent();
                console.error("Error settling bet:", error_12);
                res.status(400).json({ error: error_12.message || "Failed to settle bet" });
                return [3 /*break*/, 3];
            case 3: return [2 /*return*/];
        }
    });
}); });
// ==================== PERFORMANCE ROUTES ====================
router.get("/performance/latest", requireAuth, function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var userId, snapshot, error_13;
    var _a, _b, _c;
    return __generator(this, function (_d) {
        switch (_d.label) {
            case 0:
                _d.trys.push([0, 2, , 3]);
                userId = (_c = (_b = (_a = req.session) === null || _a === void 0 ? void 0 : _a.user) === null || _b === void 0 ? void 0 : _b.claims) === null || _c === void 0 ? void 0 : _c.sub;
                return [4 /*yield*/, storage.getLatestSnapshot(userId)];
            case 1:
                snapshot = _d.sent();
                res.json(snapshot);
                return [3 /*break*/, 3];
            case 2:
                error_13 = _d.sent();
                console.error("Error fetching latest snapshot:", error_13);
                res.status(500).json({ error: "Failed to fetch performance data" });
                return [3 /*break*/, 3];
            case 3: return [2 /*return*/];
        }
    });
}); });
router.get("/performance/history", requireAuth, function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var userId, days, history, error_14;
    var _a, _b, _c;
    return __generator(this, function (_d) {
        switch (_d.label) {
            case 0:
                _d.trys.push([0, 2, , 3]);
                userId = (_c = (_b = (_a = req.session) === null || _a === void 0 ? void 0 : _a.user) === null || _b === void 0 ? void 0 : _b.claims) === null || _c === void 0 ? void 0 : _c.sub;
                days = parseInt(req.query.days) || 30;
                return [4 /*yield*/, storage.getSnapshotHistory(userId, days)];
            case 1:
                history = _d.sent();
                res.json(history);
                return [3 /*break*/, 3];
            case 2:
                error_14 = _d.sent();
                console.error("Error fetching performance history:", error_14);
                res.status(500).json({ error: "Failed to fetch performance history" });
                return [3 /*break*/, 3];
            case 3: return [2 /*return*/];
        }
    });
}); });
// ==================== GAME EVENTS ROUTES ====================
router.get("/games/pending", function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var sport, games, error_15;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                _a.trys.push([0, 2, , 3]);
                sport = req.query.sport;
                return [4 /*yield*/, storage.getPendingGames(sport)];
            case 1:
                games = _a.sent();
                res.json(games);
                return [3 /*break*/, 3];
            case 2:
                error_15 = _a.sent();
                console.error("Error fetching pending games:", error_15);
                res.status(500).json({ error: "Failed to fetch pending games" });
                return [3 /*break*/, 3];
            case 3: return [2 /*return*/];
        }
    });
}); });
router.get("/games/:id", function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var gameId, game, error_16;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                _a.trys.push([0, 2, , 3]);
                gameId = req.params.id;
                return [4 /*yield*/, storage.getGameEvent(gameId)];
            case 1:
                game = _a.sent();
                if (!game) {
                    return [2 /*return*/, res.status(404).json({ error: "Game not found" })];
                }
                res.json(game);
                return [3 /*break*/, 3];
            case 2:
                error_16 = _a.sent();
                console.error("Error fetching game:", error_16);
                res.status(500).json({ error: "Failed to fetch game" });
                return [3 /*break*/, 3];
            case 3: return [2 /*return*/];
        }
    });
}); });
// ==================== LINE MOVEMENTS ROUTES ====================
router.get("/line-movements", function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var propId, movements, error_17;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                _a.trys.push([0, 2, , 3]);
                propId = req.query.propId;
                if (!propId) {
                    return [2 /*return*/, res.status(400).json({ error: "propId is required" })];
                }
                return [4 /*yield*/, storage.getLineMovements(parseInt(propId))];
            case 1:
                movements = _a.sent();
                res.json(movements);
                return [3 /*break*/, 3];
            case 2:
                error_17 = _a.sent();
                console.error("Error fetching line movements:", error_17);
                res.status(500).json({ error: "Failed to fetch line movements" });
                return [3 /*break*/, 3];
            case 3: return [2 /*return*/];
        }
    });
}); });
router.get("/line-movements/recent", function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var hours, movements, error_18;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                _a.trys.push([0, 2, , 3]);
                hours = parseInt(req.query.hours) || 24;
                return [4 /*yield*/, storage.getRecentLineMovements(hours)];
            case 1:
                movements = _a.sent();
                res.json(movements);
                return [3 /*break*/, 3];
            case 2:
                error_18 = _a.sent();
                console.error("Error fetching recent line movements:", error_18);
                res.status(500).json({ error: "Failed to fetch recent line movements" });
                return [3 /*break*/, 3];
            case 3: return [2 /*return*/];
        }
    });
}); });
// ==================== SCOREBOARD ROUTES ====================
router.get("/scoreboard", function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var liveScoreboardService, scores, error_19;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                _a.trys.push([0, 3, , 4]);
                return [4 /*yield*/, import("./services/liveScoreboardService")];
            case 1:
                liveScoreboardService = (_a.sent()).liveScoreboardService;
                return [4 /*yield*/, liveScoreboardService.getAllLiveScores()];
            case 2:
                scores = _a.sent();
                res.json(scores);
                return [3 /*break*/, 4];
            case 3:
                error_19 = _a.sent();
                console.error("Error fetching scoreboard:", error_19);
                res.status(500).json({ error: "Failed to fetch scoreboard" });
                return [3 /*break*/, 4];
            case 4: return [2 /*return*/];
        }
    });
}); });
// ==================== PROP COMPARISON ROUTES ====================
router.get("/prop-comparison/player", function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var _a, player, sport, mockComparisons;
    return __generator(this, function (_b) {
        try {
            _a = req.query, player = _a.player, sport = _a.sport;
            if (!player || typeof player !== 'string') {
                return [2 /*return*/, res.json([])];
            }
            mockComparisons = [
                {
                    player: player,
                    sport: sport || "Unknown",
                    stat: "Points",
                    bestLine: 27.5,
                    lineSpread: 1.5,
                    recommendation: "Best value on Underdog at 27.5. PrizePicks line is soft at 26.0.",
                    platforms: [
                        {
                            platform: "Underdog",
                            direction: "over",
                            line: 27.5,
                            confidence: 68,
                            ev: "+4.2"
                        },
                        {
                            platform: "PrizePicks",
                            direction: "over",
                            line: 26.0,
                            confidence: 72,
                            ev: "+5.8"
                        },
                        {
                            platform: "Sleeper",
                            direction: "over",
                            line: 27.0,
                            confidence: 65,
                            ev: "+2.1"
                        }
                    ]
                },
                {
                    player: player,
                    sport: sport || "Unknown",
                    stat: "Assists",
                    bestLine: 8.5,
                    lineSpread: 0.5,
                    recommendation: "Lines are tight across platforms. Slight edge on PrizePicks.",
                    platforms: [
                        {
                            platform: "PrizePicks",
                            direction: "over",
                            line: 8.5,
                            confidence: 61,
                            ev: "+1.8"
                        },
                        {
                            platform: "Underdog",
                            direction: "over",
                            line: 8.0,
                            confidence: 58,
                            ev: "+0.9"
                        }
                    ]
                }
            ];
            res.json(mockComparisons);
        }
        catch (error) {
            console.error("Error fetching prop comparison:", error);
            res.status(500).json({ error: "Failed to fetch prop comparison" });
        }
        return [2 /*return*/];
    });
}); });
// ==================== PLAYER SEARCH ROUTES ====================
router.get("/players/search", function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var _a, search, sport, espnPlayerClient, balldontlieClient, selectedSport, results, playersResponse, nbaPlayers, error_20, nhlPlayers, nflPlayers, error_21;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0:
                _b.trys.push([0, 11, , 12]);
                _a = req.query, search = _a.search, sport = _a.sport;
                if (!search || typeof search !== 'string' || search.length < 2) {
                    return [2 /*return*/, res.json([])];
                }
                return [4 /*yield*/, import("./integrations/espnPlayerClient")];
            case 1:
                espnPlayerClient = (_b.sent()).espnPlayerClient;
                return [4 /*yield*/, import("./integrations/balldontlieClient")];
            case 2:
                balldontlieClient = (_b.sent()).balldontlieClient;
                selectedSport = sport && typeof sport === 'string' ? sport : "All";
                results = [];
                if (!(selectedSport === "All" || selectedSport === "NBA")) return [3 /*break*/, 6];
                _b.label = 3;
            case 3:
                _b.trys.push([3, 5, , 6]);
                return [4 /*yield*/, balldontlieClient.searchPlayers(search)];
            case 4:
                playersResponse = _b.sent();
                nbaPlayers = (playersResponse.data || []).map(function (player) { return ({
                    id: player.id.toString(),
                    fullName: "".concat(player.first_name, " ").concat(player.last_name),
                    displayName: "".concat(player.first_name, " ").concat(player.last_name),
                    shortName: "".concat(player.first_name.charAt(0), ". ").concat(player.last_name),
                    team: {
                        name: player.team.full_name || "".concat(player.team.city, " ").concat(player.team.name),
                        abbreviation: player.team.abbreviation
                    },
                    position: player.position ? { abbreviation: player.position } : { abbreviation: "N/A" },
                    sport: "NBA"
                }); });
                results.push.apply(results, nbaPlayers);
                return [3 /*break*/, 6];
            case 5:
                error_20 = _b.sent();
                console.error("Error fetching NBA players from BallDontLie:", error_20);
                return [3 /*break*/, 6];
            case 6:
                if (!(selectedSport === "All" || selectedSport === "NHL")) return [3 /*break*/, 8];
                return [4 /*yield*/, espnPlayerClient.searchNHLPlayers(search)];
            case 7:
                nhlPlayers = _b.sent();
                results.push.apply(results, nhlPlayers.map(function (p) { return (__assign(__assign({}, p), { sport: "NHL" })); }));
                _b.label = 8;
            case 8:
                if (!(selectedSport === "All" || selectedSport === "NFL")) return [3 /*break*/, 10];
                return [4 /*yield*/, espnPlayerClient.searchNFLPlayers(search)];
            case 9:
                nflPlayers = _b.sent();
                results.push.apply(results, nflPlayers.map(function (p) { return (__assign(__assign({}, p), { sport: "NFL" })); }));
                _b.label = 10;
            case 10:
                if (selectedSport === "All" || selectedSport === "MLB") {
                    // MLB search would be added here when available
                    // For now, skip MLB
                }
                res.json(results.slice(0, 20));
                return [3 /*break*/, 12];
            case 11:
                error_21 = _b.sent();
                console.error("Error searching players:", error_21);
                res.status(500).json({ error: "Failed to search players" });
                return [3 /*break*/, 12];
            case 12: return [2 /*return*/];
        }
    });
}); });
export default router;
