var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (Object.prototype.hasOwnProperty.call(b, p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        if (typeof b !== "function" && b !== null)
            throw new TypeError("Class extends value " + String(b) + " is not a constructor or null");
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
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
import { IntegrationClient } from "./integrationClient";
var BalldontlieClient = /** @class */ (function (_super) {
    __extends(BalldontlieClient, _super);
    function BalldontlieClient() {
        var _this = _super.call(this, 'https://api.balldontlie.io/v1', {
            provider: 'balldontlie',
            requestsPerMinute: 5, // Free tier: 5 requests/min
            requestsPerHour: 300, // Free tier: ~5 req/min * 60 min
            requestsPerDay: 7200, // Free tier: ~5 req/min * 60 min * 24 hr
        }, { ttl: 300, useETag: true, useLastModified: true }) || this;
        _this.apiKey = process.env.BALLDONTLIE_API_KEY || "";
        return _this;
    }
    BalldontlieClient.prototype.getHeaders = function () {
        return this.apiKey ? { 'Authorization': this.apiKey } : undefined;
    };
    BalldontlieClient.prototype.getPlayerStats = function (playerId, season) {
        return __awaiter(this, void 0, void 0, function () {
            var response;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.get("/stats?player_ids[]=".concat(playerId, "&seasons[]=").concat(season, "&per_page=100"), { headers: this.getHeaders() })];
                    case 1:
                        response = _a.sent();
                        return [2 /*return*/, response.data];
                }
            });
        });
    };
    BalldontlieClient.prototype.getRecentPlayerStats = function (playerId_1) {
        return __awaiter(this, arguments, void 0, function (playerId, games) {
            var currentSeason, response;
            if (games === void 0) { games = 10; }
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        currentSeason = new Date().getMonth() < 6 ? new Date().getFullYear() - 1 : new Date().getFullYear();
                        return [4 /*yield*/, this.get("/stats?player_ids[]=".concat(playerId, "&seasons[]=").concat(currentSeason, "&per_page=").concat(games), { headers: this.getHeaders() })];
                    case 1:
                        response = _a.sent();
                        return [2 /*return*/, response.data];
                }
            });
        });
    };
    BalldontlieClient.prototype.getTodaysGames = function () {
        return __awaiter(this, void 0, void 0, function () {
            var today, response;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        today = new Date().toISOString().split('T')[0];
                        return [4 /*yield*/, this.get("/games?dates[]=".concat(today, "&per_page=100"), { headers: this.getHeaders() })];
                    case 1:
                        response = _a.sent();
                        return [2 /*return*/, response.data];
                }
            });
        });
    };
    BalldontlieClient.prototype.getGamesByDate = function (date) {
        return __awaiter(this, void 0, void 0, function () {
            var response;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.get("/games?dates[]=".concat(date, "&per_page=100"), { headers: this.getHeaders() })];
                    case 1:
                        response = _a.sent();
                        return [2 /*return*/, response.data];
                }
            });
        });
    };
    BalldontlieClient.prototype.getGame = function (gameId) {
        return __awaiter(this, void 0, void 0, function () {
            var response;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.get("/games/".concat(gameId), {
                            headers: this.getHeaders()
                        })];
                    case 1:
                        response = _a.sent();
                        return [2 /*return*/, response.data];
                }
            });
        });
    };
    BalldontlieClient.prototype.searchPlayers = function (playerName) {
        return __awaiter(this, void 0, void 0, function () {
            var response;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.get("/players?search=".concat(encodeURIComponent(playerName), "&per_page=25"), { headers: this.getHeaders() })];
                    case 1:
                        response = _a.sent();
                        return [2 /*return*/, response.data];
                }
            });
        });
    };
    BalldontlieClient.prototype.getPlayer = function (playerId) {
        return __awaiter(this, void 0, void 0, function () {
            var response;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.get("/players/".concat(playerId), {
                            headers: this.getHeaders()
                        })];
                    case 1:
                        response = _a.sent();
                        return [2 /*return*/, response.data];
                }
            });
        });
    };
    BalldontlieClient.prototype.calculatePlayerAverages = function (stats) {
        var games = stats.data;
        var total = games.reduce(function (acc, game) { return ({
            pts: acc.pts + game.pts,
            reb: acc.reb + game.reb,
            ast: acc.ast + game.ast,
            fgm: acc.fgm + game.fgm,
            fga: acc.fga + game.fga,
            fg3m: acc.fg3m + game.fg3m,
            fg3a: acc.fg3a + game.fg3a,
            ftm: acc.ftm + game.ftm,
            fta: acc.fta + game.fta,
        }); }, {
            pts: 0, reb: 0, ast: 0, fgm: 0, fga: 0, fg3m: 0, fg3a: 0, ftm: 0, fta: 0
        });
        var gamesPlayed = games.length;
        return {
            ppg: gamesPlayed > 0 ? total.pts / gamesPlayed : 0,
            rpg: gamesPlayed > 0 ? total.reb / gamesPlayed : 0,
            apg: gamesPlayed > 0 ? total.ast / gamesPlayed : 0,
            fg_pct: total.fga > 0 ? (total.fgm / total.fga) * 100 : 0,
            fg3_pct: total.fg3a > 0 ? (total.fg3m / total.fg3a) * 100 : 0,
            ft_pct: total.fta > 0 ? (total.ftm / total.fta) * 100 : 0,
            gamesPlayed: gamesPlayed,
        };
    };
    return BalldontlieClient;
}(IntegrationClient));
export { BalldontlieClient };
export var balldontlieClient = new BalldontlieClient();
