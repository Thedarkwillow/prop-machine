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
import { balldontlieClient } from "../integrations/balldontlieClient";
import { espnPlayerClient } from "../integrations/espnPlayerClient";
var PlayerComparisonService = /** @class */ (function () {
    function PlayerComparisonService() {
    }
    /**
     * Compare two players stats (multi-sport)
     */
    PlayerComparisonService.prototype.comparePlayers = function (playerName1_1, playerName2_1) {
        return __awaiter(this, arguments, void 0, function (playerName1, playerName2, sport) {
            if (sport === void 0) { sport = "NBA"; }
            return __generator(this, function (_a) {
                switch (sport) {
                    case "NBA":
                        return [2 /*return*/, this.compareNBAPlayers(playerName1, playerName2)];
                    case "NHL":
                        return [2 /*return*/, this.compareNHLPlayers(playerName1, playerName2)];
                    case "NFL":
                        return [2 /*return*/, this.compareNFLPlayers(playerName1, playerName2)];
                    default:
                        throw new Error("Unsupported sport: ".concat(sport));
                }
                return [2 /*return*/];
            });
        });
    };
    /**
     * Compare two NBA players stats
     */
    PlayerComparisonService.prototype.compareNBAPlayers = function (playerName1, playerName2) {
        return __awaiter(this, void 0, void 0, function () {
            var _a, search1, search2, player1, player2, currentSeason, _b, stats1Response, stats2Response, stats1, stats2;
            return __generator(this, function (_c) {
                switch (_c.label) {
                    case 0: return [4 /*yield*/, Promise.all([
                            balldontlieClient.searchPlayers(playerName1),
                            balldontlieClient.searchPlayers(playerName2),
                        ])];
                    case 1:
                        _a = _c.sent(), search1 = _a[0], search2 = _a[1];
                        if (!search1.data[0] || !search2.data[0]) {
                            throw new Error('One or both players not found');
                        }
                        player1 = search1.data[0];
                        player2 = search2.data[0];
                        currentSeason = new Date().getMonth() < 6
                            ? new Date().getFullYear() - 1
                            : new Date().getFullYear();
                        return [4 /*yield*/, Promise.all([
                                balldontlieClient.getRecentPlayerStats(player1.id, 10),
                                balldontlieClient.getRecentPlayerStats(player2.id, 10),
                            ])];
                    case 2:
                        _b = _c.sent(), stats1Response = _b[0], stats2Response = _b[1];
                        stats1 = balldontlieClient.calculatePlayerAverages(stats1Response);
                        stats2 = balldontlieClient.calculatePlayerAverages(stats2Response);
                        return [2 /*return*/, {
                                sport: "NBA",
                                player1: {
                                    id: player1.id,
                                    name: "".concat(player1.first_name, " ").concat(player1.last_name),
                                    team: player1.team.full_name,
                                    sport: "NBA",
                                    stats: stats1,
                                    recentGames: stats1Response.data.slice(0, 5),
                                },
                                player2: {
                                    id: player2.id,
                                    name: "".concat(player2.first_name, " ").concat(player2.last_name),
                                    team: player2.team.full_name,
                                    sport: "NBA",
                                    stats: stats2,
                                    recentGames: stats2Response.data.slice(0, 5),
                                },
                                comparison: {
                                    ppgDiff: stats1.ppg - stats2.ppg,
                                    rpgDiff: stats1.rpg - stats2.rpg,
                                    apgDiff: stats1.apg - stats2.apg,
                                    betterScorer: stats1.ppg > stats2.ppg ? 'player1' : 'player2',
                                    betterRebounder: stats1.rpg > stats2.rpg ? 'player1' : 'player2',
                                    betterPlaymaker: stats1.apg > stats2.apg ? 'player1' : 'player2',
                                },
                            }];
                }
            });
        });
    };
    /**
     * Compare two NHL players stats
     */
    PlayerComparisonService.prototype.compareNHLPlayers = function (playerName1, playerName2) {
        return __awaiter(this, void 0, void 0, function () {
            var _a, players1, players2, player1, player2, _b, stats1, stats2;
            var _c, _d;
            return __generator(this, function (_e) {
                switch (_e.label) {
                    case 0: return [4 /*yield*/, Promise.all([
                            espnPlayerClient.searchNHLPlayers(playerName1),
                            espnPlayerClient.searchNHLPlayers(playerName2),
                        ])];
                    case 1:
                        _a = _e.sent(), players1 = _a[0], players2 = _a[1];
                        if (!players1[0] || !players2[0]) {
                            throw new Error('One or both players not found');
                        }
                        player1 = players1[0];
                        player2 = players2[0];
                        return [4 /*yield*/, Promise.all([
                                espnPlayerClient.getNHLPlayerStats(player1.id),
                                espnPlayerClient.getNHLPlayerStats(player2.id),
                            ])];
                    case 2:
                        _b = _e.sent(), stats1 = _b[0], stats2 = _b[1];
                        return [2 /*return*/, {
                                sport: "NHL",
                                player1: {
                                    id: player1.id,
                                    name: player1.fullName || player1.displayName,
                                    team: ((_c = player1.team) === null || _c === void 0 ? void 0 : _c.name) || "Unknown",
                                    sport: "NHL",
                                    stats: {
                                        goals: stats1.goals || 0,
                                        assists: stats1.assists || 0,
                                        points: stats1.points || 0,
                                        plusMinus: stats1.plus_minus || 0,
                                        gamesPlayed: stats1.gamesPlayed,
                                    },
                                },
                                player2: {
                                    id: player2.id,
                                    name: player2.fullName || player2.displayName,
                                    team: ((_d = player2.team) === null || _d === void 0 ? void 0 : _d.name) || "Unknown",
                                    sport: "NHL",
                                    stats: {
                                        goals: stats2.goals || 0,
                                        assists: stats2.assists || 0,
                                        points: stats2.points || 0,
                                        plusMinus: stats2.plus_minus || 0,
                                        gamesPlayed: stats2.gamesPlayed,
                                    },
                                },
                                comparison: {
                                    goalsDiff: (stats1.goals || 0) - (stats2.goals || 0),
                                    assistsDiff: (stats1.assists || 0) - (stats2.assists || 0),
                                    pointsDiff: (stats1.points || 0) - (stats2.points || 0),
                                    betterScorer: (stats1.goals || 0) > (stats2.goals || 0) ? 'player1' : 'player2',
                                    betterPlaymaker: (stats1.assists || 0) > (stats2.assists || 0) ? 'player1' : 'player2',
                                },
                            }];
                }
            });
        });
    };
    /**
     * Compare two NFL players stats
     */
    PlayerComparisonService.prototype.compareNFLPlayers = function (playerName1, playerName2) {
        return __awaiter(this, void 0, void 0, function () {
            var _a, players1, players2, player1, player2, _b, stats1, stats2, determineBetterPasser, determineBetterRusher, determineBetterReceiver;
            var _c, _d;
            return __generator(this, function (_e) {
                switch (_e.label) {
                    case 0: return [4 /*yield*/, Promise.all([
                            espnPlayerClient.searchNFLPlayers(playerName1),
                            espnPlayerClient.searchNFLPlayers(playerName2),
                        ])];
                    case 1:
                        _a = _e.sent(), players1 = _a[0], players2 = _a[1];
                        if (!players1[0] || !players2[0]) {
                            throw new Error('One or both players not found');
                        }
                        player1 = players1[0];
                        player2 = players2[0];
                        return [4 /*yield*/, Promise.all([
                                espnPlayerClient.getNFLPlayerStats(player1.id),
                                espnPlayerClient.getNFLPlayerStats(player2.id),
                            ])];
                    case 2:
                        _b = _e.sent(), stats1 = _b[0], stats2 = _b[1];
                        determineBetterPasser = function () {
                            var yards1 = stats1.passing_yards || 0;
                            var yards2 = stats2.passing_yards || 0;
                            return yards1 > yards2 ? 'player1' : 'player2';
                        };
                        determineBetterRusher = function () {
                            var yards1 = stats1.rushing_yards || 0;
                            var yards2 = stats2.rushing_yards || 0;
                            return yards1 > yards2 ? 'player1' : 'player2';
                        };
                        determineBetterReceiver = function () {
                            var yards1 = stats1.receiving_yards || 0;
                            var yards2 = stats2.receiving_yards || 0;
                            return yards1 > yards2 ? 'player1' : 'player2';
                        };
                        return [2 /*return*/, {
                                sport: "NFL",
                                player1: {
                                    id: player1.id,
                                    name: player1.fullName || player1.displayName,
                                    team: ((_c = player1.team) === null || _c === void 0 ? void 0 : _c.name) || "Unknown",
                                    sport: "NFL",
                                    stats: {
                                        passingYards: stats1.passing_yards,
                                        passingTDs: stats1.passing_touchdowns,
                                        rushingYards: stats1.rushing_yards,
                                        rushingTDs: stats1.rushing_touchdowns,
                                        receivingYards: stats1.receiving_yards,
                                        receivingTDs: stats1.receiving_touchdowns,
                                        receptions: stats1.receptions,
                                        gamesPlayed: stats1.gamesPlayed,
                                    },
                                },
                                player2: {
                                    id: player2.id,
                                    name: player2.fullName || player2.displayName,
                                    team: ((_d = player2.team) === null || _d === void 0 ? void 0 : _d.name) || "Unknown",
                                    sport: "NFL",
                                    stats: {
                                        passingYards: stats2.passing_yards,
                                        passingTDs: stats2.passing_touchdowns,
                                        rushingYards: stats2.rushing_yards,
                                        rushingTDs: stats2.rushing_touchdowns,
                                        receivingYards: stats2.receiving_yards,
                                        receivingTDs: stats2.receiving_touchdowns,
                                        receptions: stats2.receptions,
                                        gamesPlayed: stats2.gamesPlayed,
                                    },
                                },
                                comparison: {
                                    betterPasser: (stats1.passing_yards || 0) > 0 || (stats2.passing_yards || 0) > 0 ? determineBetterPasser() : undefined,
                                    betterRusher: (stats1.rushing_yards || 0) > 0 || (stats2.rushing_yards || 0) > 0 ? determineBetterRusher() : undefined,
                                    betterReceiver: (stats1.receiving_yards || 0) > 0 || (stats2.receiving_yards || 0) > 0 ? determineBetterReceiver() : undefined,
                                },
                            }];
                }
            });
        });
    };
    /**
     * Get detailed player stats
     */
    PlayerComparisonService.prototype.getPlayerDetails = function (playerName) {
        return __awaiter(this, void 0, void 0, function () {
            var searchResult, player, statsResponse, averages;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, balldontlieClient.searchPlayers(playerName)];
                    case 1:
                        searchResult = _a.sent();
                        if (!searchResult.data[0]) {
                            throw new Error('Player not found');
                        }
                        player = searchResult.data[0];
                        return [4 /*yield*/, balldontlieClient.getRecentPlayerStats(player.id, 10)];
                    case 2:
                        statsResponse = _a.sent();
                        averages = balldontlieClient.calculatePlayerAverages(statsResponse);
                        return [2 /*return*/, {
                                id: player.id,
                                name: "".concat(player.first_name, " ").concat(player.last_name),
                                team: player.team.full_name,
                                position: player.position,
                                averages: averages,
                                recentGames: statsResponse.data,
                            }];
                }
            });
        });
    };
    return PlayerComparisonService;
}());
export { PlayerComparisonService };
export var playerComparisonService = new PlayerComparisonService();
