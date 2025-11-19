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
import { scoreboardClient } from "../integrations/scoreboardClient";
import { storage } from "../storage";
var LiveScoreboardService = /** @class */ (function () {
    function LiveScoreboardService() {
    }
    /**
     * Get live scores for a sport
     */
    LiveScoreboardService.prototype.getLiveScores = function (sport) {
        return __awaiter(this, void 0, void 0, function () {
            var games, _i, games_1, game, existing, gameEvent, error_1;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 9, , 10]);
                        return [4 /*yield*/, scoreboardClient.getScoresBySport(sport)];
                    case 1:
                        games = _a.sent();
                        _i = 0, games_1 = games;
                        _a.label = 2;
                    case 2:
                        if (!(_i < games_1.length)) return [3 /*break*/, 8];
                        game = games_1[_i];
                        return [4 /*yield*/, storage.getGameEvent(game.gameId)];
                    case 3:
                        existing = _a.sent();
                        if (!existing) return [3 /*break*/, 5];
                        return [4 /*yield*/, storage.updateGameEvent(game.gameId, {
                                homeScore: game.homeScore,
                                awayScore: game.awayScore,
                                status: game.status,
                                playerStats: game.playerStats,
                            })];
                    case 4:
                        _a.sent();
                        return [3 /*break*/, 7];
                    case 5:
                        gameEvent = {
                            sport: game.sport,
                            gameId: game.gameId,
                            homeTeam: game.homeTeam,
                            awayTeam: game.awayTeam,
                            gameTime: game.gameTime,
                            status: game.status,
                            homeScore: game.homeScore,
                            awayScore: game.awayScore,
                            playerStats: game.playerStats,
                        };
                        return [4 /*yield*/, storage.createGameEvent(gameEvent)];
                    case 6:
                        _a.sent();
                        _a.label = 7;
                    case 7:
                        _i++;
                        return [3 /*break*/, 2];
                    case 8: return [2 /*return*/, games];
                    case 9:
                        error_1 = _a.sent();
                        console.error("[Scoreboard] Failed to fetch ".concat(sport, " scores:"), error_1);
                        return [2 /*return*/, []];
                    case 10: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Get all live games across sports
     */
    LiveScoreboardService.prototype.getAllLiveScores = function () {
        return __awaiter(this, void 0, void 0, function () {
            var _a, nba, nhl, nfl, mlb;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0: return [4 /*yield*/, Promise.all([
                            this.getLiveScores('NBA'),
                            this.getLiveScores('NHL'),
                            this.getLiveScores('NFL'),
                            this.getLiveScores('MLB'),
                        ])];
                    case 1:
                        _a = _b.sent(), nba = _a[0], nhl = _a[1], nfl = _a[2], mlb = _a[3];
                        return [2 /*return*/, {
                                NBA: nba,
                                NHL: nhl,
                                NFL: nfl,
                                MLB: mlb,
                            }];
                }
            });
        });
    };
    /**
     * Get games in progress
     */
    LiveScoreboardService.prototype.getInProgressGames = function (sport) {
        return __awaiter(this, void 0, void 0, function () {
            var allGames;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, storage.getPendingGames(sport)];
                    case 1:
                        allGames = _a.sent();
                        return [2 /*return*/, allGames.filter(function (g) { return g.status === 'in_progress'; })];
                }
            });
        });
    };
    /**
     * Check for completed games and return them for settlement
     */
    LiveScoreboardService.prototype.getCompletedGames = function (sport) {
        return __awaiter(this, void 0, void 0, function () {
            var allGames;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, storage.getPendingGames(sport)];
                    case 1:
                        allGames = _a.sent();
                        return [2 /*return*/, allGames.filter(function (g) { return g.status === 'final'; })];
                }
            });
        });
    };
    return LiveScoreboardService;
}());
export { LiveScoreboardService };
export var liveScoreboardService = new LiveScoreboardService();
