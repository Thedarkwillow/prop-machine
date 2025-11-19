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
import { storage } from "../storage";
var SettlementService = /** @class */ (function () {
    function SettlementService() {
        this.lastProcessedTimestamp = new Date(0);
    }
    /**
     * Main settlement routine - processes all pending bets
     */
    SettlementService.prototype.settlePendingBets = function (sport) {
        return __awaiter(this, void 0, void 0, function () {
            var report, pendingGames, now_1, gamesToCheck, _i, gamesToCheck_1, game, settled, _a, _b, result, error_1, err, error_2, err;
            return __generator(this, function (_c) {
                switch (_c.label) {
                    case 0:
                        report = {
                            gamesProcessed: 0,
                            betsSettled: 0,
                            wins: 0,
                            losses: 0,
                            pushes: 0,
                            totalBankrollChange: 0,
                            results: [],
                            errors: [],
                        };
                        _c.label = 1;
                    case 1:
                        _c.trys.push([1, 9, , 10]);
                        return [4 /*yield*/, storage.getPendingGames(sport)];
                    case 2:
                        pendingGames = _c.sent();
                        now_1 = new Date();
                        gamesToCheck = pendingGames.filter(function (game) {
                            var gameTime = new Date(game.gameTime);
                            var hoursElapsed = (now_1.getTime() - gameTime.getTime()) / (1000 * 60 * 60);
                            return hoursElapsed >= 3; // Check games 3+ hours after start
                        });
                        console.log("Checking ".concat(gamesToCheck.length, " games for settlement..."));
                        _i = 0, gamesToCheck_1 = gamesToCheck;
                        _c.label = 3;
                    case 3:
                        if (!(_i < gamesToCheck_1.length)) return [3 /*break*/, 8];
                        game = gamesToCheck_1[_i];
                        _c.label = 4;
                    case 4:
                        _c.trys.push([4, 6, , 7]);
                        return [4 /*yield*/, this.settleGameBets(game)];
                    case 5:
                        settled = _c.sent();
                        report.gamesProcessed++;
                        for (_a = 0, _b = settled.results; _a < _b.length; _a++) {
                            result = _b[_a];
                            report.results.push(result);
                            report.betsSettled++;
                            if (result.outcome === 'won')
                                report.wins++;
                            else if (result.outcome === 'lost')
                                report.losses++;
                            else
                                report.pushes++;
                            report.totalBankrollChange += settled.bankrollChanges[result.betId] || 0;
                        }
                        return [3 /*break*/, 7];
                    case 6:
                        error_1 = _c.sent();
                        err = error_1;
                        report.errors.push("Game ".concat(game.gameId, ": ").concat(err.message));
                        console.error("Error settling game ".concat(game.gameId, ":"), error_1);
                        return [3 /*break*/, 7];
                    case 7:
                        _i++;
                        return [3 /*break*/, 3];
                    case 8:
                        console.log("Settlement complete: ".concat(report.betsSettled, " bets settled"));
                        console.log("Wins: ".concat(report.wins, ", Losses: ").concat(report.losses, ", Pushes: ").concat(report.pushes));
                        return [3 /*break*/, 10];
                    case 9:
                        error_2 = _c.sent();
                        err = error_2;
                        report.errors.push("Settlement service error: ".concat(err.message));
                        console.error('Settlement service error:', error_2);
                        return [3 /*break*/, 10];
                    case 10: return [2 /*return*/, report];
                }
            });
        });
    };
    /**
     * Settle all bets for a specific game
     */
    SettlementService.prototype.settleGameBets = function (game) {
        return __awaiter(this, void 0, void 0, function () {
            var results, bankrollChanges, playerStats, allProps, gameProps, _i, gameProps_1, prop, propResults, _a, propResults_1, result, settleResult;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        results = [];
                        bankrollChanges = {};
                        playerStats = {};
                        if (game.sport === 'NBA') {
                            // For now, use stored player stats from game event
                            playerStats = game.playerStats || {};
                        }
                        if (!(game.status !== 'final')) return [3 /*break*/, 2];
                        return [4 /*yield*/, storage.updateGameEvent(game.gameId, {
                                status: 'final',
                                finalizedAt: new Date(),
                            })];
                    case 1:
                        _b.sent();
                        _b.label = 2;
                    case 2: return [4 /*yield*/, storage.getAllActiveProps()];
                    case 3:
                        allProps = _b.sent();
                        gameProps = allProps.filter(function (prop) {
                            return (prop.team === game.homeTeam || prop.team === game.awayTeam) &&
                                new Date(prop.gameTime).getTime() === new Date(game.gameTime).getTime();
                        });
                        _i = 0, gameProps_1 = gameProps;
                        _b.label = 4;
                    case 4:
                        if (!(_i < gameProps_1.length)) return [3 /*break*/, 10];
                        prop = gameProps_1[_i];
                        return [4 /*yield*/, this.settleProp(prop, playerStats)];
                    case 5:
                        propResults = _b.sent();
                        _a = 0, propResults_1 = propResults;
                        _b.label = 6;
                    case 6:
                        if (!(_a < propResults_1.length)) return [3 /*break*/, 9];
                        result = propResults_1[_a];
                        results.push(result);
                        return [4 /*yield*/, storage.settleBetWithBankrollUpdate(result.betId, result.outcome, result.closingLine, result.clv)];
                    case 7:
                        settleResult = _b.sent();
                        if (settleResult.success) {
                            bankrollChanges[result.betId] = settleResult.bankrollChange;
                        }
                        _b.label = 8;
                    case 8:
                        _a++;
                        return [3 /*break*/, 6];
                    case 9:
                        _i++;
                        return [3 /*break*/, 4];
                    case 10: return [2 /*return*/, { results: results, bankrollChanges: bankrollChanges }];
                }
            });
        });
    };
    /**
     * Settle a specific prop
     */
    SettlementService.prototype.settleProp = function (prop, playerStats) {
        return __awaiter(this, void 0, void 0, function () {
            var results, actualValue, allUsers, propBets, _i, allUsers_1, userId, userBets, userPropBets, _a, propBets_1, bet, line, closingLine, outcome, clv, openingLine, closing, lineMovement;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        results = [];
                        actualValue = this.getPlayerStatValue(prop.player, prop.stat, playerStats);
                        if (actualValue === null) {
                            console.warn("No stats found for ".concat(prop.player, " - ").concat(prop.stat));
                            return [2 /*return*/, results];
                        }
                        allUsers = ['seed-user-1'];
                        propBets = [];
                        _i = 0, allUsers_1 = allUsers;
                        _b.label = 1;
                    case 1:
                        if (!(_i < allUsers_1.length)) return [3 /*break*/, 4];
                        userId = allUsers_1[_i];
                        return [4 /*yield*/, storage.getBetsWithProps(userId)];
                    case 2:
                        userBets = _b.sent();
                        userPropBets = userBets.filter(function (bet) { return bet.propId === prop.id && bet.status === 'pending'; });
                        propBets.push.apply(propBets, userPropBets);
                        _b.label = 3;
                    case 3:
                        _i++;
                        return [3 /*break*/, 1];
                    case 4:
                        // Determine outcome for each bet
                        for (_a = 0, propBets_1 = propBets; _a < propBets_1.length; _a++) {
                            bet = propBets_1[_a];
                            line = parseFloat(prop.line);
                            closingLine = prop.currentLine ? prop.currentLine : prop.line;
                            outcome = void 0;
                            clv = '0.0';
                            // Calculate closing line value
                            if (prop.currentLine) {
                                openingLine = parseFloat(prop.line);
                                closing = parseFloat(prop.currentLine);
                                lineMovement = closing - openingLine;
                                // CLV calculation: positive if line moved in our favor
                                if (prop.direction === 'over') {
                                    clv = ((openingLine - closing) * 2).toFixed(1); // Lower line = better for over
                                }
                                else {
                                    clv = ((closing - openingLine) * 2).toFixed(1); // Higher line = better for under
                                }
                            }
                            // Determine win/loss/push
                            if (Math.abs(actualValue - line) < 0.01) {
                                outcome = 'pushed';
                            }
                            else if (prop.direction === 'over') {
                                outcome = actualValue > line ? 'won' : 'lost';
                            }
                            else {
                                outcome = actualValue < line ? 'won' : 'lost';
                            }
                            results.push({
                                betId: bet.id,
                                outcome: outcome,
                                closingLine: closingLine.toString(),
                                clv: clv,
                                actualValue: actualValue,
                                reason: "".concat(prop.player, " ").concat(prop.stat, ": ").concat(actualValue, " vs line ").concat(line, " (").concat(prop.direction, ")"),
                            });
                        }
                        return [2 /*return*/, results];
                }
            });
        });
    };
    /**
     * Extract player stat value from game stats
     */
    SettlementService.prototype.getPlayerStatValue = function (playerName, stat, playerStats) {
        var _a;
        // This is simplified - in production you'd need proper player matching
        var stats = playerStats[playerName];
        if (!stats)
            return null;
        // Map stat names to actual stat keys
        var statMap = {
            'Points': 'pts',
            'Rebounds': 'reb',
            'Assists': 'ast',
            'Threes': 'fg3m',
            'SOG': 'shots', // Shots on goal (hockey) - would need different API
            'Saves': 'saves',
            'Pass Yards': 'passing_yards',
            'Pass TDs': 'passing_tds',
            'Rush Yards': 'rushing_yards',
            'Receptions': 'receptions',
            'Hits': 'hits',
            'Total Bases': 'total_bases',
            'Strikeouts': 'strikeouts',
            'Runs + RBIs': 'runs_rbis',
        };
        var statKey = statMap[stat] || stat.toLowerCase();
        return (_a = stats[statKey]) !== null && _a !== void 0 ? _a : null;
    };
    /**
     * Create performance snapshot after settlement
     */
    SettlementService.prototype.createPerformanceSnapshot = function (userId) {
        return __awaiter(this, void 0, void 0, function () {
            var user, allBets, settledBets, wins, losses, pushes, totalAmount, totalReturns, roi, winRate, betsWithClv, avgClv, error_3;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 4, , 5]);
                        return [4 /*yield*/, storage.getUser(userId)];
                    case 1:
                        user = _a.sent();
                        if (!user)
                            return [2 /*return*/];
                        return [4 /*yield*/, storage.getBetsByUser(userId)];
                    case 2:
                        allBets = _a.sent();
                        settledBets = allBets.filter(function (bet) { return bet.status !== 'pending'; });
                        if (settledBets.length === 0)
                            return [2 /*return*/];
                        wins = settledBets.filter(function (bet) { return bet.status === 'won'; }).length;
                        losses = settledBets.filter(function (bet) { return bet.status === 'lost'; }).length;
                        pushes = settledBets.filter(function (bet) { return bet.status === 'pushed'; }).length;
                        totalAmount = settledBets.reduce(function (sum, bet) { return sum + parseFloat(bet.amount); }, 0);
                        totalReturns = settledBets
                            .filter(function (bet) { return bet.status === 'won'; })
                            .reduce(function (sum, bet) { return sum + parseFloat(bet.potentialReturn || '0'); }, 0);
                        roi = totalAmount > 0 ? ((totalReturns - totalAmount) / totalAmount) * 100 : 0;
                        winRate = settledBets.length > 0 ? (wins / settledBets.length) * 100 : 0;
                        betsWithClv = settledBets.filter(function (bet) { return bet.clv; });
                        avgClv = betsWithClv.length > 0
                            ? betsWithClv.reduce(function (sum, bet) { return sum + parseFloat(bet.clv || '0'); }, 0) / betsWithClv.length
                            : 0;
                        return [4 /*yield*/, storage.createSnapshot({
                                userId: userId,
                                date: new Date(),
                                bankroll: user.bankroll,
                                totalBets: settledBets.length,
                                wins: wins,
                                losses: losses,
                                pushes: pushes,
                                winRate: winRate.toFixed(2),
                                roi: roi.toFixed(2),
                                avgClv: avgClv.toFixed(2),
                                kellyCompliance: '95.0', // Placeholder - would need actual Kelly calculation
                            })];
                    case 3:
                        _a.sent();
                        console.log("Performance snapshot created for user ".concat(userId));
                        return [3 /*break*/, 5];
                    case 4:
                        error_3 = _a.sent();
                        console.error('Error creating performance snapshot:', error_3);
                        return [3 /*break*/, 5];
                    case 5: return [2 /*return*/];
                }
            });
        });
    };
    return SettlementService;
}());
export { SettlementService };
export var settlementService = new SettlementService();
