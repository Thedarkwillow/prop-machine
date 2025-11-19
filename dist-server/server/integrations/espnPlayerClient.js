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
var ESPN_PLAYER_RATE_LIMIT = {
    provider: "espn_players",
    requestsPerMinute: 30,
    requestsPerHour: 1000,
    requestsPerDay: 5000,
};
var ESPNPlayerClient = /** @class */ (function (_super) {
    __extends(ESPNPlayerClient, _super);
    function ESPNPlayerClient() {
        return _super.call(this, "https://sports.core.api.espn.com", ESPN_PLAYER_RATE_LIMIT) || this;
    }
    /**
     * Search for NFL players by name using v3 athletes endpoint with full data
     */
    ESPNPlayerClient.prototype.searchNFLPlayers = function (searchTerm) {
        return __awaiter(this, void 0, void 0, function () {
            var searchLower_1, response, rawMatches, error_1;
            var _a;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        _b.trys.push([0, 2, , 3]);
                        searchLower_1 = searchTerm.toLowerCase();
                        return [4 /*yield*/, this.get("/v3/sports/football/nfl/athletes?limit=5000")];
                    case 1:
                        response = _b.sent();
                        if (!((_a = response === null || response === void 0 ? void 0 : response.data) === null || _a === void 0 ? void 0 : _a.items))
                            return [2 /*return*/, []];
                        rawMatches = response.data.items.filter(function (player) {
                            var _a, _b;
                            var fullName = ((_a = player.fullName) === null || _a === void 0 ? void 0 : _a.toLowerCase()) || "";
                            var displayName = ((_b = player.displayName) === null || _b === void 0 ? void 0 : _b.toLowerCase()) || "";
                            return fullName.includes(searchLower_1) || displayName.includes(searchLower_1);
                        });
                        // Ensure consistent structure for downstream use
                        return [2 /*return*/, rawMatches.slice(0, 10).map(function (player) {
                                var _a, _b;
                                return ({
                                    id: player.id,
                                    fullName: player.fullName,
                                    displayName: player.displayName,
                                    shortName: player.shortName,
                                    team: { name: ((_a = player.team) === null || _a === void 0 ? void 0 : _a.name) || ((_b = player.team) === null || _b === void 0 ? void 0 : _b.displayName) || "Unknown" },
                                    position: player.position,
                                });
                            })];
                    case 2:
                        error_1 = _b.sent();
                        console.error("Error searching NFL players:", error_1);
                        return [2 /*return*/, []];
                    case 3: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Search for NHL players by name using v3 athletes endpoint with full data
     */
    ESPNPlayerClient.prototype.searchNHLPlayers = function (searchTerm) {
        return __awaiter(this, void 0, void 0, function () {
            var searchLower_2, response, rawMatches, error_2;
            var _a;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        _b.trys.push([0, 2, , 3]);
                        searchLower_2 = searchTerm.toLowerCase();
                        return [4 /*yield*/, this.get("/v3/sports/hockey/nhl/athletes?limit=2000")];
                    case 1:
                        response = _b.sent();
                        if (!((_a = response === null || response === void 0 ? void 0 : response.data) === null || _a === void 0 ? void 0 : _a.items))
                            return [2 /*return*/, []];
                        rawMatches = response.data.items.filter(function (player) {
                            var _a, _b;
                            var fullName = ((_a = player.fullName) === null || _a === void 0 ? void 0 : _a.toLowerCase()) || "";
                            var displayName = ((_b = player.displayName) === null || _b === void 0 ? void 0 : _b.toLowerCase()) || "";
                            return fullName.includes(searchLower_2) || displayName.includes(searchLower_2);
                        });
                        // Ensure consistent structure for downstream use
                        return [2 /*return*/, rawMatches.slice(0, 10).map(function (player) {
                                var _a, _b;
                                return ({
                                    id: player.id,
                                    fullName: player.fullName,
                                    displayName: player.displayName,
                                    shortName: player.shortName,
                                    team: { name: ((_a = player.team) === null || _a === void 0 ? void 0 : _a.name) || ((_b = player.team) === null || _b === void 0 ? void 0 : _b.displayName) || "Unknown" },
                                    position: player.position,
                                });
                            })];
                    case 2:
                        error_2 = _b.sent();
                        console.error("Error searching NHL players:", error_2);
                        return [2 /*return*/, []];
                    case 3: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Get NFL player season stats
     */
    ESPNPlayerClient.prototype.getNFLPlayerStats = function (playerId) {
        return __awaiter(this, void 0, void 0, function () {
            var statsUrl, response, stats, passingStats, rushingStats, receivingStats, error_3;
            var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o, _p, _q, _r, _s, _t, _u;
            return __generator(this, function (_v) {
                switch (_v.label) {
                    case 0:
                        _v.trys.push([0, 2, , 3]);
                        statsUrl = "/v2/sports/football/leagues/nfl/seasons/2024/athletes/".concat(playerId, "/statistics/0");
                        console.log("[ESPN] Fetching NFL stats for player ".concat(playerId, ": ").concat(statsUrl));
                        return [4 /*yield*/, this.get(statsUrl)];
                    case 1:
                        response = _v.sent();
                        console.log("[ESPN] NFL stats response structure:", JSON.stringify({
                            hasData: !!(response === null || response === void 0 ? void 0 : response.data),
                            hasSplits: !!((_a = response === null || response === void 0 ? void 0 : response.data) === null || _a === void 0 ? void 0 : _a.splits),
                            categories: ((_d = (_c = (_b = response === null || response === void 0 ? void 0 : response.data) === null || _b === void 0 ? void 0 : _b.splits) === null || _c === void 0 ? void 0 : _c.categories) === null || _d === void 0 ? void 0 : _d.length) || 0
                        }));
                        stats = ((_f = (_e = response === null || response === void 0 ? void 0 : response.data) === null || _e === void 0 ? void 0 : _e.splits) === null || _f === void 0 ? void 0 : _f.categories) || [];
                        passingStats = ((_g = stats.find(function (c) { return c.name === 'passing'; })) === null || _g === void 0 ? void 0 : _g.stats) || [];
                        rushingStats = ((_h = stats.find(function (c) { return c.name === 'rushing'; })) === null || _h === void 0 ? void 0 : _h.stats) || [];
                        receivingStats = ((_j = stats.find(function (c) { return c.name === 'receiving'; })) === null || _j === void 0 ? void 0 : _j.stats) || [];
                        return [2 /*return*/, {
                                passing_yards: ((_k = passingStats.find(function (s) { return s.name === 'passingYards'; })) === null || _k === void 0 ? void 0 : _k.value) || 0,
                                passing_touchdowns: ((_l = passingStats.find(function (s) { return s.name === 'passingTouchdowns'; })) === null || _l === void 0 ? void 0 : _l.value) || 0,
                                rushing_yards: ((_m = rushingStats.find(function (s) { return s.name === 'rushingYards'; })) === null || _m === void 0 ? void 0 : _m.value) || 0,
                                rushing_touchdowns: ((_o = rushingStats.find(function (s) { return s.name === 'rushingTouchdowns'; })) === null || _o === void 0 ? void 0 : _o.value) || 0,
                                receiving_yards: ((_p = receivingStats.find(function (s) { return s.name === 'receivingYards'; })) === null || _p === void 0 ? void 0 : _p.value) || 0,
                                receiving_touchdowns: ((_q = receivingStats.find(function (s) { return s.name === 'receivingTouchdowns'; })) === null || _q === void 0 ? void 0 : _q.value) || 0,
                                receptions: ((_r = receivingStats.find(function (s) { return s.name === 'receptions'; })) === null || _r === void 0 ? void 0 : _r.value) || 0,
                                gamesPlayed: ((_s = passingStats.find(function (s) { return s.name === 'gamesPlayed'; })) === null || _s === void 0 ? void 0 : _s.value) ||
                                    ((_t = rushingStats.find(function (s) { return s.name === 'gamesPlayed'; })) === null || _t === void 0 ? void 0 : _t.value) ||
                                    ((_u = receivingStats.find(function (s) { return s.name === 'gamesPlayed'; })) === null || _u === void 0 ? void 0 : _u.value) || 0,
                            }];
                    case 2:
                        error_3 = _v.sent();
                        console.error("Error fetching NFL player stats:", error_3);
                        return [2 /*return*/, { gamesPlayed: 0 }];
                    case 3: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Get NHL player season stats
     */
    ESPNPlayerClient.prototype.getNHLPlayerStats = function (playerId) {
        return __awaiter(this, void 0, void 0, function () {
            var statsUrl, response, stats, error_4;
            var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o, _p, _q;
            return __generator(this, function (_r) {
                switch (_r.label) {
                    case 0:
                        _r.trys.push([0, 2, , 3]);
                        statsUrl = "/v2/sports/hockey/leagues/nhl/seasons/2025/athletes/".concat(playerId, "/statistics/0");
                        console.log("[ESPN] Fetching NHL stats for player ".concat(playerId, ": ").concat(statsUrl));
                        return [4 /*yield*/, this.get(statsUrl)];
                    case 1:
                        response = _r.sent();
                        console.log("[ESPN] NHL stats response structure:", JSON.stringify({
                            hasData: !!(response === null || response === void 0 ? void 0 : response.data),
                            hasSplits: !!((_a = response === null || response === void 0 ? void 0 : response.data) === null || _a === void 0 ? void 0 : _a.splits),
                            categories: ((_d = (_c = (_b = response === null || response === void 0 ? void 0 : response.data) === null || _b === void 0 ? void 0 : _b.splits) === null || _c === void 0 ? void 0 : _c.categories) === null || _d === void 0 ? void 0 : _d.length) || 0
                        }));
                        stats = ((_h = (_g = (_f = (_e = response === null || response === void 0 ? void 0 : response.data) === null || _e === void 0 ? void 0 : _e.splits) === null || _f === void 0 ? void 0 : _f.categories) === null || _g === void 0 ? void 0 : _g[0]) === null || _h === void 0 ? void 0 : _h.stats) || [];
                        return [2 /*return*/, {
                                goals: ((_j = stats.find(function (s) { return s.name === 'goals'; })) === null || _j === void 0 ? void 0 : _j.value) || 0,
                                assists: ((_k = stats.find(function (s) { return s.name === 'assists'; })) === null || _k === void 0 ? void 0 : _k.value) || 0,
                                points: ((_l = stats.find(function (s) { return s.name === 'points'; })) === null || _l === void 0 ? void 0 : _l.value) || 0,
                                plus_minus: ((_m = stats.find(function (s) { return s.name === 'plusMinus'; })) === null || _m === void 0 ? void 0 : _m.value) || 0,
                                penalty_minutes: ((_o = stats.find(function (s) { return s.name === 'penaltyMinutes'; })) === null || _o === void 0 ? void 0 : _o.value) || 0,
                                shots: ((_p = stats.find(function (s) { return s.name === 'shots'; })) === null || _p === void 0 ? void 0 : _p.value) || 0,
                                gamesPlayed: ((_q = stats.find(function (s) { return s.name === 'gamesPlayed'; })) === null || _q === void 0 ? void 0 : _q.value) || 0,
                            }];
                    case 2:
                        error_4 = _r.sent();
                        console.error("Error fetching NHL player stats:", error_4);
                        return [2 /*return*/, { gamesPlayed: 0 }];
                    case 3: return [2 /*return*/];
                }
            });
        });
    };
    return ESPNPlayerClient;
}(IntegrationClient));
export var espnPlayerClient = new ESPNPlayerClient();
