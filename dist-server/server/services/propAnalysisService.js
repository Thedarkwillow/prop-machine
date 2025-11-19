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
import { modelScorer } from "../ml/modelScorer";
import { WeatherService } from "./weatherService";
var PropAnalysisService = /** @class */ (function () {
    function PropAnalysisService(storage) {
        this.weatherService = null;
        this.statMapping = {
            'Points': 'pts',
            'Rebounds': 'reb',
            'Assists': 'ast',
            'Steals': 'stl',
            'Blocks': 'blk',
            '3-Pointers Made': 'fg3m',
            'PTS': 'pts',
            'REB': 'reb',
            'AST': 'ast',
            'STL': 'stl',
            'BLK': 'blk',
        };
        if (storage) {
            this.weatherService = new WeatherService(storage);
        }
    }
    PropAnalysisService.prototype.extractStatValue = function (game, statKey) {
        var mapping = {
            'pts': 'pts',
            'reb': 'reb',
            'ast': 'ast',
            'stl': 'stl',
            'blk': 'blk',
            'fg3m': 'fg3m',
        };
        var actualKey = mapping[statKey];
        return actualKey ? game[actualKey] : 0;
    };
    PropAnalysisService.prototype.analyzeProp = function (input) {
        return __awaiter(this, void 0, void 0, function () {
            var line, playersResponse, player, recentStats, currentSeason, seasonStats, statKey, recentAverage, seasonAverage, modelScore, error_1;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        line = parseFloat(input.line);
                        if (input.sport !== 'NBA') {
                            return [2 /*return*/, this.handleNonNBAProps(input, line)];
                        }
                        _a.label = 1;
                    case 1:
                        _a.trys.push([1, 6, , 7]);
                        return [4 /*yield*/, balldontlieClient.searchPlayers(input.player)];
                    case 2:
                        playersResponse = _a.sent();
                        if (!playersResponse.data || playersResponse.data.length === 0) {
                            console.log("Player not found: ".concat(input.player));
                            return [2 /*return*/, this.fallbackAnalysis(input, line, "Player \"".concat(input.player, "\" not found in database"))];
                        }
                        player = playersResponse.data[0];
                        console.log("Found player: ".concat(player.first_name, " ").concat(player.last_name, " (ID: ").concat(player.id, ")"));
                        return [4 /*yield*/, balldontlieClient.getRecentPlayerStats(player.id, 10)];
                    case 3:
                        recentStats = _a.sent();
                        currentSeason = new Date().getMonth() < 6 ? new Date().getFullYear() - 1 : new Date().getFullYear();
                        return [4 /*yield*/, balldontlieClient.getPlayerStats(player.id, currentSeason)];
                    case 4:
                        seasonStats = _a.sent();
                        statKey = this.statMapping[input.stat];
                        if (!statKey) {
                            console.log("Stat type not supported: ".concat(input.stat));
                            return [2 /*return*/, this.fallbackAnalysis(input, line, "Stat type \"".concat(input.stat, "\" not yet supported"))];
                        }
                        recentAverage = this.calculateAverage(recentStats.data, statKey);
                        seasonAverage = this.calculateAverage(seasonStats.data, statKey);
                        console.log("Recent avg: ".concat(recentAverage.toFixed(2), ", Season avg: ").concat(seasonAverage.toFixed(2), ", Line: ").concat(line));
                        return [4 /*yield*/, modelScorer.scoreProp({
                                playerName: input.player,
                                stat: input.stat,
                                line: line,
                                direction: input.direction,
                                sport: input.sport,
                                recentAverage: recentAverage,
                                seasonAverage: seasonAverage,
                            })];
                    case 5:
                        modelScore = _a.sent();
                        return [2 /*return*/, {
                                confidence: modelScore.confidence,
                                ev: modelScore.expectedValue,
                                modelProbability: modelScore.modelProbability,
                                reasoning: modelScore.reasoning,
                                sport: input.sport,
                                player: input.player,
                                team: input.team,
                                opponent: input.opponent,
                                stat: input.stat,
                                line: input.line,
                                direction: input.direction,
                                platform: input.platform,
                            }];
                    case 6:
                        error_1 = _a.sent();
                        console.error('Error in prop analysis:', error_1);
                        return [2 /*return*/, this.fallbackAnalysis(input, line, 'API error, using basic analysis')];
                    case 7: return [2 /*return*/];
                }
            });
        });
    };
    PropAnalysisService.prototype.calculateAverage = function (games, statKey) {
        var _this = this;
        if (!games || games.length === 0)
            return 0;
        var total = games.reduce(function (sum, game) {
            return sum + _this.extractStatValue(game, statKey);
        }, 0);
        return total / games.length;
    };
    PropAnalysisService.prototype.handleNonNBAProps = function (input, line) {
        return __awaiter(this, void 0, void 0, function () {
            var baseConfidence, modelProbability, platformOdds, impliedProbability, ev, reasoning, weatherDataResult, weatherData, position, weatherImpact, error_2;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        baseConfidence = 65;
                        modelProbability = 0.60;
                        platformOdds = 1.9;
                        impliedProbability = 1 / platformOdds;
                        ev = ((modelProbability - impliedProbability) / impliedProbability) * 100;
                        reasoning = [
                            "".concat(input.sport, " data not yet integrated with live stats"),
                            "Using baseline analysis for ".concat(input.stat, " ").concat(input.direction, " ").concat(line),
                            "Moderate confidence play, manual research recommended",
                        ];
                        if (!(input.sport === 'NFL' && input.gameId && input.gameTime && this.weatherService)) return [3 /*break*/, 7];
                        _a.label = 1;
                    case 1:
                        _a.trys.push([1, 6, , 7]);
                        return [4 /*yield*/, this.weatherService.fetchAndStoreWeather(input.gameId, input.team, input.gameTime)];
                    case 2:
                        weatherDataResult = _a.sent();
                        if (!weatherDataResult) return [3 /*break*/, 4];
                        return [4 /*yield*/, this.weatherService.getWeatherForGame(input.gameId)];
                    case 3:
                        weatherData = _a.sent();
                        if (weatherData) {
                            position = this.inferPositionFromStat(input.stat);
                            weatherImpact = this.weatherService.analyzeWeatherImpact(weatherData, input.stat, position);
                            baseConfidence = Math.max(0, Math.min(100, baseConfidence + Math.round(weatherImpact.overallImpact / 2)));
                            reasoning.push.apply(reasoning, weatherImpact.reasoning);
                            if (weatherData.isDome) {
                                reasoning.push("Indoor stadium - stable playing conditions");
                            }
                            else {
                                reasoning.push("Weather conditions factored into confidence score");
                            }
                        }
                        return [3 /*break*/, 5];
                    case 4:
                        reasoning.push("Weather data unavailable for this game");
                        _a.label = 5;
                    case 5: return [3 /*break*/, 7];
                    case 6:
                        error_2 = _a.sent();
                        console.error("Error fetching weather data:", error_2);
                        reasoning.push("Weather analysis unavailable");
                        return [3 /*break*/, 7];
                    case 7: return [2 /*return*/, {
                            confidence: baseConfidence,
                            ev: parseFloat(ev.toFixed(2)),
                            modelProbability: parseFloat(modelProbability.toFixed(4)),
                            reasoning: reasoning,
                            sport: input.sport,
                            player: input.player,
                            team: input.team,
                            opponent: input.opponent,
                            stat: input.stat,
                            line: input.line,
                            direction: input.direction,
                            platform: input.platform,
                        }];
                }
            });
        });
    };
    PropAnalysisService.prototype.fallbackAnalysis = function (input, line, reason) {
        var baseConfidence = 65;
        var modelProbability = 0.60;
        var platformOdds = 1.9;
        var impliedProbability = 1 / platformOdds;
        var ev = ((modelProbability - impliedProbability) / impliedProbability) * 100;
        var reasoning = [
            reason,
            "Using baseline analysis for ".concat(input.stat, " ").concat(input.direction, " ").concat(line),
            "Moderate confidence, proceed with caution",
        ];
        return {
            confidence: baseConfidence,
            ev: parseFloat(ev.toFixed(2)),
            modelProbability: parseFloat(modelProbability.toFixed(4)),
            reasoning: reasoning,
            sport: input.sport,
            player: input.player,
            team: input.team,
            opponent: input.opponent,
            stat: input.stat,
            line: input.line,
            direction: input.direction,
            platform: input.platform,
        };
    };
    PropAnalysisService.prototype.inferPositionFromStat = function (stat) {
        var lowerStat = stat.toLowerCase();
        if (lowerStat.includes('passing') || lowerStat.includes('completions') || lowerStat.includes('attempts')) {
            return 'QB';
        }
        if (lowerStat.includes('rushing') || lowerStat.includes('carries')) {
            return 'RB';
        }
        if (lowerStat.includes('receiving') || lowerStat.includes('receptions') || lowerStat.includes('targets')) {
            return 'WR';
        }
        if (lowerStat.includes('field goal') || lowerStat.includes('extra point')) {
            return 'K';
        }
        return 'FLEX';
    };
    return PropAnalysisService;
}());
export { PropAnalysisService };
export function createPropAnalysisService(storage) {
    return new PropAnalysisService(storage);
}
export var propAnalysisService = new PropAnalysisService();
