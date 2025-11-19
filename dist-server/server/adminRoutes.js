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
import { Router } from "express";
import { settlementService } from "./services/settlementService";
import { balldontlieClient } from "./integrations/balldontlieClient";
import { modelScorer } from "./ml/modelScorer";
import { storage } from "./storage";
import { propFetcherService } from "./services/propFetcherService";
import { propSchedulerService } from "./services/propSchedulerService";
import { refreshProps } from "./seed";
// Admin middleware - require authentication AND admin role
function requireAdmin(req, res, next) {
    return __awaiter(this, void 0, void 0, function () {
        var userId, user, error_1;
        var _a, _b;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0:
                    if (!req.isAuthenticated || !req.isAuthenticated()) {
                        return [2 /*return*/, res.status(401).json({
                                success: false,
                                error: "Authentication required for admin access",
                            })];
                    }
                    _c.label = 1;
                case 1:
                    _c.trys.push([1, 3, , 4]);
                    userId = (_b = (_a = req.user) === null || _a === void 0 ? void 0 : _a.claims) === null || _b === void 0 ? void 0 : _b.sub;
                    if (!userId) {
                        return [2 /*return*/, res.status(401).json({
                                success: false,
                                error: "Invalid user session",
                            })];
                    }
                    return [4 /*yield*/, storage.getUser(userId)];
                case 2:
                    user = _c.sent();
                    if (!user || !user.isAdmin) {
                        return [2 /*return*/, res.status(403).json({
                                success: false,
                                error: "Admin privileges required",
                            })];
                    }
                    next();
                    return [3 /*break*/, 4];
                case 3:
                    error_1 = _c.sent();
                    return [2 /*return*/, res.status(500).json({
                            success: false,
                            error: "Failed to verify admin status",
                        })];
                case 4: return [2 /*return*/];
            }
        });
    });
}
// Require authentication (but not admin) for certain endpoints
function requireAuth(req, res, next) {
    return __awaiter(this, void 0, void 0, function () {
        return __generator(this, function (_a) {
            if (!req.isAuthenticated || !req.isAuthenticated()) {
                return [2 /*return*/, res.status(401).json({
                        success: false,
                        error: "Authentication required",
                    })];
            }
            next();
            return [2 /*return*/];
        });
    });
}
export function adminRoutes() {
    var _this = this;
    var router = Router();
    // Get prop scheduler status (public - read-only status info)
    router.get("/props/scheduler/status", function (req, res) { return __awaiter(_this, void 0, void 0, function () {
        var status, err;
        return __generator(this, function (_a) {
            try {
                status = propSchedulerService.getStatus();
                res.json(status);
            }
            catch (error) {
                err = error;
                res.status(500).json({
                    success: false,
                    error: err.message,
                });
            }
            return [2 /*return*/];
        });
    }); });
    // Multi-platform prop refresh (requires authentication, not admin)
    router.post("/props/refresh", requireAuth, function (req, res) { return __awaiter(_this, void 0, void 0, function () {
        var sports, targetSports, result, error_2, err;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 2, , 3]);
                    sports = req.body.sports;
                    targetSports = sports || ['NBA', 'NFL', 'NHL'];
                    return [4 /*yield*/, propSchedulerService.triggerManualRefresh(targetSports)];
                case 1:
                    result = _a.sent();
                    res.json({
                        success: result.success,
                        summary: {
                            totalPropsFetched: result.totalPropsFetched,
                            totalPropsCreated: result.totalPropsCreated,
                            totalErrors: result.totalErrors,
                        },
                        results: result.results.map(function (r) { return ({
                            platform: r.platform,
                            sport: r.sport,
                            propsFetched: r.propsFetched,
                            propsCreated: r.propsCreated,
                            propsSkipped: r.propsSkipped,
                            errorCount: r.errors.length,
                            errors: r.errors.slice(0, 5),
                        }); }),
                    });
                    return [3 /*break*/, 3];
                case 2:
                    error_2 = _a.sent();
                    err = error_2;
                    console.error("Prop refresh error:", error_2);
                    res.status(500).json({
                        success: false,
                        error: err.message,
                    });
                    return [3 /*break*/, 3];
                case 3: return [2 /*return*/];
            }
        });
    }); });
    // Apply admin role check to all routes below this point
    router.use(requireAdmin);
    // Manual settlement trigger
    router.post("/settlement/run", function (req, res) { return __awaiter(_this, void 0, void 0, function () {
        var sport, report, error_3, err;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 2, , 3]);
                    sport = req.body.sport;
                    console.log("Manual settlement triggered for sport: ".concat(sport || 'all'));
                    return [4 /*yield*/, settlementService.settlePendingBets(sport)];
                case 1:
                    report = _a.sent();
                    res.json({
                        success: true,
                        report: report,
                    });
                    return [3 /*break*/, 3];
                case 2:
                    error_3 = _a.sent();
                    err = error_3;
                    console.error("Settlement error:", error_3);
                    res.status(500).json({
                        success: false,
                        error: err.message,
                    });
                    return [3 /*break*/, 3];
                case 3: return [2 /*return*/];
            }
        });
    }); });
    // Fetch and analyze props from The Odds API
    router.post("/props/fetch", function (req, res) { return __awaiter(_this, void 0, void 0, function () {
        var sport, targetSport, result, error_4, err;
        var _a;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    _b.trys.push([0, 2, , 3]);
                    sport = req.body.sport;
                    targetSport = sport || 'NBA';
                    console.log("Fetching props for ".concat(targetSport, "..."));
                    return [4 /*yield*/, propFetcherService.fetchAndAnalyzeProps(targetSport)];
                case 1:
                    result = _b.sent();
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
                            warningCount: ((_a = result.warnings) === null || _a === void 0 ? void 0 : _a.length) || 0,
                        },
                        errors: result.errors.slice(0, 10),
                        warnings: result.warnings || [],
                    });
                    return [3 /*break*/, 3];
                case 2:
                    error_4 = _b.sent();
                    err = error_4;
                    console.error("Prop fetch error:", error_4);
                    res.status(500).json({
                        success: false,
                        error: err.message,
                    });
                    return [3 /*break*/, 3];
                case 3: return [2 /*return*/];
            }
        });
    }); });
    // Refresh sample props with current game times (for development)
    router.post("/props/refresh-samples", function (req, res) { return __awaiter(_this, void 0, void 0, function () {
        var result, error_5, err;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 2, , 3]);
                    console.log("Refreshing sample props with current game times...");
                    return [4 /*yield*/, refreshProps()];
                case 1:
                    result = _a.sent();
                    if (result.success) {
                        res.json({
                            success: true,
                            message: "Refreshed ".concat(result.count, " sample props with current game times"),
                            count: result.count,
                        });
                    }
                    else {
                        res.status(500).json({
                            success: false,
                            error: result.error || "Failed to refresh props",
                        });
                    }
                    return [3 /*break*/, 3];
                case 2:
                    error_5 = _a.sent();
                    err = error_5;
                    console.error("Sample props refresh error:", error_5);
                    res.status(500).json({
                        success: false,
                        error: err.message,
                    });
                    return [3 /*break*/, 3];
                case 3: return [2 /*return*/];
            }
        });
    }); });
    // Create performance snapshot for a user
    router.post("/performance/snapshot", function (req, res) { return __awaiter(_this, void 0, void 0, function () {
        var userId, error_6, err;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 2, , 3]);
                    userId = req.body.userId;
                    if (!userId) {
                        return [2 /*return*/, res.status(400).json({
                                success: false,
                                error: "userId is required",
                            })];
                    }
                    return [4 /*yield*/, settlementService.createPerformanceSnapshot(userId)];
                case 1:
                    _a.sent();
                    res.json({
                        success: true,
                        message: "Performance snapshot created for user ".concat(userId),
                    });
                    return [3 /*break*/, 3];
                case 2:
                    error_6 = _a.sent();
                    err = error_6;
                    console.error("Snapshot error:", error_6);
                    res.status(500).json({
                        success: false,
                        error: err.message,
                    });
                    return [3 /*break*/, 3];
                case 3: return [2 /*return*/];
            }
        });
    }); });
    // Test BALLDONTLIE integration
    router.get("/test/balldontlie", function (req, res) { return __awaiter(_this, void 0, void 0, function () {
        var todaysGames, error_7, err;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 2, , 3]);
                    return [4 /*yield*/, balldontlieClient.getTodaysGames()];
                case 1:
                    todaysGames = _a.sent();
                    res.json({
                        success: true,
                        gamesCount: todaysGames.data.length,
                        games: todaysGames.data.slice(0, 5), // First 5 games
                    });
                    return [3 /*break*/, 3];
                case 2:
                    error_7 = _a.sent();
                    err = error_7;
                    console.error("BALLDONTLIE test error:", error_7);
                    res.status(500).json({
                        success: false,
                        error: err.message,
                    });
                    return [3 /*break*/, 3];
                case 3: return [2 /*return*/];
            }
        });
    }); });
    // Test ML model scorer
    router.post("/test/model", function (req, res) { return __awaiter(_this, void 0, void 0, function () {
        var features, score, error_8, err;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 2, , 3]);
                    features = {
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
                    return [4 /*yield*/, modelScorer.scoreProp(features)];
                case 1:
                    score = _a.sent();
                    res.json({
                        success: true,
                        features: features,
                        score: score,
                    });
                    return [3 /*break*/, 3];
                case 2:
                    error_8 = _a.sent();
                    err = error_8;
                    console.error("Model test error:", error_8);
                    res.status(500).json({
                        success: false,
                        error: err.message,
                    });
                    return [3 /*break*/, 3];
                case 3: return [2 /*return*/];
            }
        });
    }); });
    // Get system stats
    router.get("/stats", function (req, res) { return __awaiter(_this, void 0, void 0, function () {
        var allProps, allModels, sportBreakdown, error_9, err;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 3, , 4]);
                    return [4 /*yield*/, storage.getAllActiveProps()];
                case 1:
                    allProps = _a.sent();
                    return [4 /*yield*/, storage.getAllModels()];
                case 2:
                    allModels = _a.sent();
                    sportBreakdown = allProps.reduce(function (acc, prop) {
                        acc[prop.sport] = (acc[prop.sport] || 0) + 1;
                        return acc;
                    }, {});
                    res.json({
                        success: true,
                        stats: {
                            activeProps: allProps.length,
                            sportBreakdown: sportBreakdown,
                            models: allModels.length,
                        },
                    });
                    return [3 /*break*/, 4];
                case 3:
                    error_9 = _a.sent();
                    err = error_9;
                    console.error("Stats error:", error_9);
                    res.status(500).json({
                        success: false,
                        error: err.message,
                    });
                    return [3 /*break*/, 4];
                case 4: return [2 /*return*/];
            }
        });
    }); });
    // Manually rescore all props
    router.post("/props/rescore", function (req, res) { return __awaiter(_this, void 0, void 0, function () {
        var allProps, rescored, _i, allProps_1, prop, mockFeatures, score, error_10, err;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 6, , 7]);
                    return [4 /*yield*/, storage.getAllActiveProps()];
                case 1:
                    allProps = _a.sent();
                    rescored = 0;
                    _i = 0, allProps_1 = allProps;
                    _a.label = 2;
                case 2:
                    if (!(_i < allProps_1.length)) return [3 /*break*/, 5];
                    prop = allProps_1[_i];
                    mockFeatures = {
                        playerName: prop.player,
                        stat: prop.stat,
                        line: parseFloat(prop.line),
                        direction: prop.direction,
                        sport: prop.sport,
                        recentAverage: parseFloat(prop.line) * (prop.confidence / 100 + 0.2),
                        seasonAverage: parseFloat(prop.line) * (prop.confidence / 100 + 0.1),
                        opponentRanking: 15,
                        homeAway: 'home',
                        lineMovement: prop.currentLine ? parseFloat(prop.currentLine) - parseFloat(prop.line) : 0,
                    };
                    return [4 /*yield*/, modelScorer.scoreProp(mockFeatures)];
                case 3:
                    score = _a.sent();
                    // Update prop with new scores would require an updateProp method in storage
                    // For now, just count
                    rescored++;
                    _a.label = 4;
                case 4:
                    _i++;
                    return [3 /*break*/, 2];
                case 5:
                    res.json({
                        success: true,
                        message: "Rescored ".concat(rescored, " props"),
                        propsRescored: rescored,
                    });
                    return [3 /*break*/, 7];
                case 6:
                    error_10 = _a.sent();
                    err = error_10;
                    console.error("Rescore error:", error_10);
                    res.status(500).json({
                        success: false,
                        error: err.message,
                    });
                    return [3 /*break*/, 7];
                case 7: return [2 /*return*/];
            }
        });
    }); });
    return router;
}
