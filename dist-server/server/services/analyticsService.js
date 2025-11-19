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
var __spreadArray = (this && this.__spreadArray) || function (to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
};
var AnalyticsService = /** @class */ (function () {
    function AnalyticsService(storage) {
        this.storage = storage;
    }
    AnalyticsService.prototype.generateSnapshot = function (userId) {
        return __awaiter(this, void 0, void 0, function () {
            var betsWithProps, settledBets, platformStats, sportStats, confidenceBrackets, streaks, bestPerformers, avgBetSize, snapshot, error_1;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 3, , 4]);
                        return [4 /*yield*/, this.storage.getBetsWithProps(userId)];
                    case 1:
                        betsWithProps = _a.sent();
                        settledBets = betsWithProps.filter(function (bet) { return bet.status !== 'pending'; });
                        if (settledBets.length === 0) {
                            console.log("No settled bets to analyze");
                            return [2 /*return*/];
                        }
                        platformStats = this.calculatePlatformStats(settledBets);
                        sportStats = this.calculateSportStats(settledBets);
                        confidenceBrackets = this.calculateConfidenceBrackets(settledBets);
                        streaks = this.calculateStreaks(settledBets);
                        bestPerformers = this.findBestPerformers(sportStats, platformStats);
                        avgBetSize = this.calculateAverageBetSize(settledBets);
                        snapshot = {
                            userId: userId,
                            date: new Date(),
                            platformStats: platformStats,
                            sportStats: sportStats,
                            confidenceBrackets: confidenceBrackets,
                            hotStreak: streaks.hotStreak,
                            coldStreak: streaks.coldStreak,
                            bestSport: bestPerformers.bestSport,
                            bestPlatform: bestPerformers.bestPlatform,
                            avgBetSize: avgBetSize.toString(),
                        };
                        return [4 /*yield*/, this.storage.createAnalyticsSnapshot(snapshot)];
                    case 2:
                        _a.sent();
                        console.log("Analytics snapshot created for user ".concat(userId));
                        return [3 /*break*/, 4];
                    case 3:
                        error_1 = _a.sent();
                        console.error("Error generating analytics snapshot:", error_1);
                        throw error_1;
                    case 4: return [2 /*return*/];
                }
            });
        });
    };
    AnalyticsService.prototype.calculatePlatformStats = function (bets) {
        var _a, _b;
        var statsByPlatform = {};
        for (var _i = 0, bets_1 = bets; _i < bets_1.length; _i++) {
            var bet = bets_1[_i];
            var platform = ((_a = bet.prop) === null || _a === void 0 ? void 0 : _a.platform) || ((_b = bet.slip) === null || _b === void 0 ? void 0 : _b.platform) || 'Unknown';
            if (!statsByPlatform[platform]) {
                statsByPlatform[platform] = {
                    platform: platform,
                    wins: 0,
                    losses: 0,
                    pushes: 0,
                    totalBets: 0,
                    winRate: 0,
                    roi: 0,
                };
            }
            var stats = statsByPlatform[platform];
            stats.totalBets++;
            if (bet.status === 'won')
                stats.wins++;
            else if (bet.status === 'lost')
                stats.losses++;
            else if (bet.status === 'pushed')
                stats.pushes++;
        }
        var _loop_1 = function (stats) {
            stats.winRate = stats.totalBets > 0
                ? parseFloat(((stats.wins / stats.totalBets) * 100).toFixed(2))
                : 0;
            var totalStaked = bets
                .filter(function (b) { var _a, _b; return (((_a = b.prop) === null || _a === void 0 ? void 0 : _a.platform) || ((_b = b.slip) === null || _b === void 0 ? void 0 : _b.platform)) === stats.platform; })
                .reduce(function (sum, b) { return sum + parseFloat(b.amount); }, 0);
            var totalReturned = bets
                .filter(function (b) { var _a, _b; return (((_a = b.prop) === null || _a === void 0 ? void 0 : _a.platform) || ((_b = b.slip) === null || _b === void 0 ? void 0 : _b.platform)) === stats.platform && b.status === 'won'; })
                .reduce(function (sum, b) { return sum + parseFloat(b.potentialReturn); }, 0);
            stats.roi = totalStaked > 0
                ? parseFloat((((totalReturned - totalStaked) / totalStaked) * 100).toFixed(2))
                : 0;
        };
        for (var _c = 0, _d = Object.values(statsByPlatform); _c < _d.length; _c++) {
            var stats = _d[_c];
            _loop_1(stats);
        }
        return statsByPlatform;
    };
    AnalyticsService.prototype.calculateSportStats = function (bets) {
        var _a;
        var statsBySport = {};
        for (var _i = 0, bets_2 = bets; _i < bets_2.length; _i++) {
            var bet = bets_2[_i];
            var sport = ((_a = bet.prop) === null || _a === void 0 ? void 0 : _a.sport) || this.getSportFromSlip(bet.slip) || 'Unknown';
            if (!statsBySport[sport]) {
                statsBySport[sport] = {
                    sport: sport,
                    wins: 0,
                    losses: 0,
                    pushes: 0,
                    totalBets: 0,
                    winRate: 0,
                    roi: 0,
                    totalStaked: 0,
                    totalReturned: 0,
                };
            }
            var stats = statsBySport[sport];
            stats.totalBets++;
            stats.totalStaked += parseFloat(bet.amount);
            if (bet.status === 'won') {
                stats.wins++;
                stats.totalReturned += parseFloat(bet.potentialReturn);
            }
            else if (bet.status === 'lost') {
                stats.losses++;
            }
            else if (bet.status === 'pushed') {
                stats.pushes++;
                stats.totalReturned += parseFloat(bet.amount);
            }
        }
        for (var _b = 0, _c = Object.values(statsBySport); _b < _c.length; _b++) {
            var stats = _c[_b];
            stats.winRate = stats.totalBets > 0
                ? parseFloat(((stats.wins / stats.totalBets) * 100).toFixed(2))
                : 0;
            stats.roi = stats.totalStaked > 0
                ? parseFloat((((stats.totalReturned - stats.totalStaked) / stats.totalStaked) * 100).toFixed(2))
                : 0;
        }
        return statsBySport;
    };
    AnalyticsService.prototype.calculateConfidenceBrackets = function (bets) {
        var _a, _b;
        var brackets = [
            { min: 60, max: 70, name: '60-70%' },
            { min: 70, max: 80, name: '70-80%' },
            { min: 80, max: 90, name: '80-90%' },
            { min: 90, max: 100, name: '90-100%' },
        ];
        var bracketStats = {};
        for (var _i = 0, brackets_1 = brackets; _i < brackets_1.length; _i++) {
            var bracket = brackets_1[_i];
            bracketStats[bracket.name] = {
                bracket: bracket.name,
                predictedWinRate: 0,
                actualWinRate: 0,
                totalBets: 0,
                accuracy: 0,
                predictedSum: 0,
            };
        }
        var _loop_2 = function (bet) {
            var confidence = ((_a = bet.prop) === null || _a === void 0 ? void 0 : _a.confidence) || ((_b = bet.slip) === null || _b === void 0 ? void 0 : _b.confidence) || 0;
            var matchingBracket = brackets.find(function (b) { return confidence >= b.min && confidence < b.max; });
            if (!matchingBracket)
                return "continue";
            var stats = bracketStats[matchingBracket.name];
            stats.totalBets++;
            stats.predictedSum += confidence;
            if (bet.status === 'won') {
                stats.actualWinRate++;
            }
        };
        for (var _c = 0, bets_3 = bets; _c < bets_3.length; _c++) {
            var bet = bets_3[_c];
            _loop_2(bet);
        }
        var result = {};
        for (var _d = 0, _e = Object.entries(bracketStats); _d < _e.length; _d++) {
            var _f = _e[_d], key = _f[0], stats = _f[1];
            if (stats.totalBets > 0) {
                var predictedWinRate = stats.predictedSum / stats.totalBets;
                var actualWinRate = (stats.actualWinRate / stats.totalBets) * 100;
                var difference = Math.abs(actualWinRate - predictedWinRate);
                result[key] = {
                    bracket: stats.bracket,
                    predictedWinRate: parseFloat(predictedWinRate.toFixed(2)),
                    actualWinRate: parseFloat(actualWinRate.toFixed(2)),
                    totalBets: stats.totalBets,
                    accuracy: Math.max(0, parseFloat((100 - difference).toFixed(2))),
                };
            }
            else {
                result[key] = {
                    bracket: stats.bracket,
                    predictedWinRate: 0,
                    actualWinRate: 0,
                    totalBets: 0,
                    accuracy: 0,
                };
            }
        }
        return result;
    };
    AnalyticsService.prototype.calculateStreaks = function (bets) {
        var sortedBets = __spreadArray([], bets, true).sort(function (a, b) {
            var aDate = a.settledAt || a.createdAt;
            var bDate = b.settledAt || b.createdAt;
            return new Date(aDate).getTime() - new Date(bDate).getTime();
        });
        var currentHotStreak = 0;
        var maxHotStreak = 0;
        var currentColdStreak = 0;
        var maxColdStreak = 0;
        for (var _i = 0, sortedBets_1 = sortedBets; _i < sortedBets_1.length; _i++) {
            var bet = sortedBets_1[_i];
            if (bet.status === 'won') {
                currentHotStreak++;
                currentColdStreak = 0;
                maxHotStreak = Math.max(maxHotStreak, currentHotStreak);
            }
            else if (bet.status === 'lost') {
                currentColdStreak++;
                currentHotStreak = 0;
                maxColdStreak = Math.max(maxColdStreak, currentColdStreak);
            }
        }
        return {
            hotStreak: maxHotStreak,
            coldStreak: maxColdStreak,
        };
    };
    AnalyticsService.prototype.findBestPerformers = function (sportStats, platformStats) {
        var bestSport = null;
        var bestSportROI = -Infinity;
        for (var _i = 0, _a = Object.entries(sportStats); _i < _a.length; _i++) {
            var _b = _a[_i], sport = _b[0], stats = _b[1];
            if (stats.totalBets >= 5 && stats.roi > bestSportROI) {
                bestSportROI = stats.roi;
                bestSport = sport;
            }
        }
        var bestPlatform = null;
        var bestPlatformWinRate = 0;
        for (var _c = 0, _d = Object.entries(platformStats); _c < _d.length; _c++) {
            var _e = _d[_c], platform = _e[0], stats = _e[1];
            if (stats.totalBets >= 5 && stats.winRate > bestPlatformWinRate) {
                bestPlatformWinRate = stats.winRate;
                bestPlatform = platform;
            }
        }
        return { bestSport: bestSport, bestPlatform: bestPlatform };
    };
    AnalyticsService.prototype.calculateAverageBetSize = function (bets) {
        if (bets.length === 0)
            return 0;
        var totalStaked = bets.reduce(function (sum, bet) { return sum + parseFloat(bet.amount); }, 0);
        return parseFloat((totalStaked / bets.length).toFixed(2));
    };
    AnalyticsService.prototype.getSportFromSlip = function (slip) {
        if (!slip || !slip.picks)
            return null;
        var picks = slip.picks;
        if (picks.length > 0 && picks[0].sport) {
            return picks[0].sport;
        }
        return null;
    };
    AnalyticsService.prototype.getLatestAnalytics = function (userId) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.storage.getLatestAnalytics(userId)];
                    case 1: return [2 /*return*/, _a.sent()];
                }
            });
        });
    };
    AnalyticsService.prototype.getAnalyticsHistory = function (userId_1) {
        return __awaiter(this, arguments, void 0, function (userId, days) {
            if (days === void 0) { days = 30; }
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.storage.getAnalyticsHistory(userId, days)];
                    case 1: return [2 /*return*/, _a.sent()];
                }
            });
        });
    };
    AnalyticsService.prototype.getPlatformComparison = function (userId) {
        return __awaiter(this, void 0, void 0, function () {
            var latest;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.storage.getLatestAnalytics(userId)];
                    case 1:
                        latest = _a.sent();
                        if (!latest || !latest.platformStats)
                            return [2 /*return*/, []];
                        return [2 /*return*/, Object.values(latest.platformStats).sort(function (a, b) { return b.winRate - a.winRate; })];
                }
            });
        });
    };
    AnalyticsService.prototype.getSportBreakdown = function (userId) {
        return __awaiter(this, void 0, void 0, function () {
            var latest;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.storage.getLatestAnalytics(userId)];
                    case 1:
                        latest = _a.sent();
                        if (!latest || !latest.sportStats)
                            return [2 /*return*/, []];
                        return [2 /*return*/, Object.values(latest.sportStats).sort(function (a, b) { return b.roi - a.roi; })];
                }
            });
        });
    };
    AnalyticsService.prototype.getConfidenceAccuracy = function (userId) {
        return __awaiter(this, void 0, void 0, function () {
            var latest;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.storage.getLatestAnalytics(userId)];
                    case 1:
                        latest = _a.sent();
                        if (!latest || !latest.confidenceBrackets)
                            return [2 /*return*/, []];
                        return [2 /*return*/, Object.values(latest.confidenceBrackets)];
                }
            });
        });
    };
    return AnalyticsService;
}());
export { AnalyticsService };
