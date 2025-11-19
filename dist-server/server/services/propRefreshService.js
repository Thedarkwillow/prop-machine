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
import { prizepicksClient } from "../integrations/prizepicksClient";
import { underdogClient } from "../integrations/underdogClient";
import { oddsApiClient } from "../integrations/oddsApiClient";
import { propAnalysisService } from "./propAnalysisService";
import { storage } from "../storage";
var PropRefreshService = /** @class */ (function () {
    function PropRefreshService() {
    }
    PropRefreshService.prototype.refreshFromPrizePicks = function () {
        return __awaiter(this, arguments, void 0, function (sport) {
            var result, response, normalizedProps, oldPropIds, _i, normalizedProps_1, rawProp, opponent, analysisInput, analysis, period, error_1, err, deactivatedCount, error_2, err;
            if (sport === void 0) { sport = 'NBA'; }
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        result = {
                            success: false,
                            platform: 'PrizePicks',
                            sport: sport,
                            propsFetched: 0,
                            propsCreated: 0,
                            propsSkipped: 0,
                            errors: [],
                            timestamp: new Date(),
                        };
                        _a.label = 1;
                    case 1:
                        _a.trys.push([1, 14, , 15]);
                        console.log("Fetching props from PrizePicks for ".concat(sport, "..."));
                        return [4 /*yield*/, prizepicksClient.getProjections(sport)];
                    case 2:
                        response = _a.sent();
                        if (!response.data || response.data.length === 0) {
                            console.log("No props found on PrizePicks for ".concat(sport));
                            result.success = true;
                            return [2 /*return*/, result];
                        }
                        normalizedProps = prizepicksClient.normalizeToProps(response, sport);
                        result.propsFetched = normalizedProps.length;
                        console.log("Found ".concat(normalizedProps.length, " props from PrizePicks"));
                        return [4 /*yield*/, storage.getActivePropIdsBySportAndPlatform(sport, 'PrizePicks')];
                    case 3:
                        oldPropIds = _a.sent();
                        console.log("Found ".concat(oldPropIds.length, " existing active PrizePicks ").concat(sport, " props to replace"));
                        _i = 0, normalizedProps_1 = normalizedProps;
                        _a.label = 4;
                    case 4:
                        if (!(_i < normalizedProps_1.length)) return [3 /*break*/, 10];
                        rawProp = normalizedProps_1[_i];
                        _a.label = 5;
                    case 5:
                        _a.trys.push([5, 8, , 9]);
                        opponent = rawProp.opponent || 'TBD';
                        analysisInput = {
                            sport: sport,
                            player: rawProp.player,
                            team: rawProp.team,
                            opponent: opponent,
                            stat: rawProp.stat,
                            line: rawProp.line,
                            direction: rawProp.direction,
                            platform: 'PrizePicks',
                        };
                        return [4 /*yield*/, propAnalysisService.analyzeProp(analysisInput)];
                    case 6:
                        analysis = _a.sent();
                        period = rawProp.period && ['full_game', '1Q', '1H', '2H', '4Q'].includes(rawProp.period)
                            ? rawProp.period
                            : 'full_game';
                        // Create the prop in database
                        return [4 /*yield*/, storage.createProp({
                                sport: sport,
                                player: rawProp.player,
                                team: rawProp.team,
                                opponent: opponent,
                                stat: rawProp.stat,
                                line: rawProp.line,
                                currentLine: rawProp.line,
                                direction: rawProp.direction,
                                period: period,
                                platform: 'PrizePicks',
                                confidence: analysis.confidence,
                                ev: analysis.ev.toString(),
                                modelProbability: analysis.modelProbability.toString(),
                                gameTime: rawProp.gameTime,
                                isActive: true,
                            })];
                    case 7:
                        // Create the prop in database
                        _a.sent();
                        result.propsCreated++;
                        if (result.propsCreated % 25 === 0) {
                            console.log("Created ".concat(result.propsCreated, " PrizePicks props..."));
                        }
                        return [3 /*break*/, 9];
                    case 8:
                        error_1 = _a.sent();
                        err = error_1;
                        result.propsSkipped++;
                        result.errors.push("".concat(rawProp.player, ": ").concat(err.message));
                        return [3 /*break*/, 9];
                    case 9:
                        _i++;
                        return [3 /*break*/, 4];
                    case 10:
                        if (!(result.propsCreated > 0 && oldPropIds.length > 0)) return [3 /*break*/, 12];
                        return [4 /*yield*/, storage.deactivateSpecificProps(oldPropIds)];
                    case 11:
                        deactivatedCount = _a.sent();
                        console.log("Deactivated ".concat(deactivatedCount, " old PrizePicks ").concat(sport, " props after successfully creating ").concat(result.propsCreated, " new props"));
                        return [3 /*break*/, 13];
                    case 12:
                        if (result.propsCreated === 0) {
                            console.log("No props created for PrizePicks ".concat(sport, ", keeping ").concat(oldPropIds.length, " existing props active"));
                        }
                        _a.label = 13;
                    case 13:
                        result.success = true;
                        console.log("PrizePicks ".concat(sport, ": Created ").concat(result.propsCreated, "/").concat(result.propsFetched, " props"));
                        return [2 /*return*/, result];
                    case 14:
                        error_2 = _a.sent();
                        err = error_2;
                        console.error('PrizePicks fetch error:', err.message);
                        result.errors.push("API error: ".concat(err.message));
                        return [2 /*return*/, result];
                    case 15: return [2 /*return*/];
                }
            });
        });
    };
    PropRefreshService.prototype.refreshFromUnderdog = function () {
        return __awaiter(this, arguments, void 0, function (sport) {
            var result, response, normalizedProps, oldPropIds, _i, normalizedProps_2, rawProp, opponent, analysisInput, analysis, period, error_3, err, deactivatedCount, error_4, err;
            if (sport === void 0) { sport = 'NBA'; }
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        result = {
                            success: false,
                            platform: 'Underdog',
                            sport: sport,
                            propsFetched: 0,
                            propsCreated: 0,
                            propsSkipped: 0,
                            errors: [],
                            timestamp: new Date(),
                        };
                        _a.label = 1;
                    case 1:
                        _a.trys.push([1, 14, , 15]);
                        console.log("Fetching props from Underdog for ".concat(sport, "..."));
                        return [4 /*yield*/, underdogClient.getAppearances(sport)];
                    case 2:
                        response = _a.sent();
                        if (!response.appearances || response.appearances.length === 0) {
                            console.log("No props found on Underdog for ".concat(sport));
                            result.success = true;
                            return [2 /*return*/, result];
                        }
                        normalizedProps = underdogClient.normalizeToProps(response, sport);
                        result.propsFetched = normalizedProps.length;
                        console.log("Found ".concat(normalizedProps.length, " props from Underdog"));
                        return [4 /*yield*/, storage.getActivePropIdsBySportAndPlatform(sport, 'Underdog')];
                    case 3:
                        oldPropIds = _a.sent();
                        console.log("Found ".concat(oldPropIds.length, " existing active Underdog ").concat(sport, " props to replace"));
                        _i = 0, normalizedProps_2 = normalizedProps;
                        _a.label = 4;
                    case 4:
                        if (!(_i < normalizedProps_2.length)) return [3 /*break*/, 10];
                        rawProp = normalizedProps_2[_i];
                        _a.label = 5;
                    case 5:
                        _a.trys.push([5, 8, , 9]);
                        opponent = rawProp.opponent || 'TBD';
                        analysisInput = {
                            sport: sport,
                            player: rawProp.player,
                            team: rawProp.team,
                            opponent: opponent,
                            stat: rawProp.stat,
                            line: rawProp.line,
                            direction: rawProp.direction,
                            platform: 'Underdog',
                        };
                        return [4 /*yield*/, propAnalysisService.analyzeProp(analysisInput)];
                    case 6:
                        analysis = _a.sent();
                        period = rawProp.period && ['full_game', '1Q', '1H', '2H', '4Q'].includes(rawProp.period)
                            ? rawProp.period
                            : 'full_game';
                        return [4 /*yield*/, storage.createProp({
                                sport: sport,
                                player: rawProp.player,
                                team: rawProp.team,
                                opponent: opponent,
                                stat: rawProp.stat,
                                line: rawProp.line,
                                currentLine: rawProp.line,
                                direction: rawProp.direction,
                                period: period,
                                platform: 'Underdog',
                                confidence: analysis.confidence,
                                ev: analysis.ev.toString(),
                                modelProbability: analysis.modelProbability.toString(),
                                gameTime: rawProp.gameTime,
                                isActive: true,
                            })];
                    case 7:
                        _a.sent();
                        result.propsCreated++;
                        if (result.propsCreated % 25 === 0) {
                            console.log("Created ".concat(result.propsCreated, " Underdog props..."));
                        }
                        return [3 /*break*/, 9];
                    case 8:
                        error_3 = _a.sent();
                        err = error_3;
                        result.propsSkipped++;
                        result.errors.push("".concat(rawProp.player, ": ").concat(err.message));
                        return [3 /*break*/, 9];
                    case 9:
                        _i++;
                        return [3 /*break*/, 4];
                    case 10:
                        if (!(result.propsCreated > 0 && oldPropIds.length > 0)) return [3 /*break*/, 12];
                        return [4 /*yield*/, storage.deactivateSpecificProps(oldPropIds)];
                    case 11:
                        deactivatedCount = _a.sent();
                        console.log("Deactivated ".concat(deactivatedCount, " old Underdog ").concat(sport, " props after successfully creating ").concat(result.propsCreated, " new props"));
                        return [3 /*break*/, 13];
                    case 12:
                        if (result.propsCreated === 0) {
                            console.log("No props created for Underdog ".concat(sport, ", keeping ").concat(oldPropIds.length, " existing props active"));
                        }
                        _a.label = 13;
                    case 13:
                        result.success = true;
                        console.log("Underdog ".concat(sport, ": Created ").concat(result.propsCreated, "/").concat(result.propsFetched, " props"));
                        return [2 /*return*/, result];
                    case 14:
                        error_4 = _a.sent();
                        err = error_4;
                        console.error('Underdog fetch error:', err.message);
                        result.errors.push("API error: ".concat(err.message));
                        return [2 /*return*/, result];
                    case 15: return [2 /*return*/];
                }
            });
        });
    };
    PropRefreshService.prototype.refreshFromOddsApi = function () {
        return __awaiter(this, arguments, void 0, function (sport) {
            var result, sportKeyMap, sportKey, response, normalizedProps, oldPropIds, _i, normalizedProps_3, rawProp, gameTime, basicConfidence, basicEV, basicProb, error_5, err, deactivatedCount, error_6, err;
            if (sport === void 0) { sport = 'NBA'; }
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        result = {
                            success: false,
                            platform: 'The Odds API',
                            sport: sport,
                            propsFetched: 0,
                            propsCreated: 0,
                            propsSkipped: 0,
                            errors: [],
                            timestamp: new Date(),
                        };
                        if (!process.env.ODDS_API_KEY) {
                            result.errors.push('ODDS_API_KEY not configured');
                            return [2 /*return*/, result];
                        }
                        _a.label = 1;
                    case 1:
                        _a.trys.push([1, 13, , 14]);
                        console.log("Fetching props from The Odds API for ".concat(sport, "..."));
                        sportKeyMap = {
                            'NBA': 'basketball_nba',
                            'NHL': 'icehockey_nhl',
                            'NFL': 'americanfootball_nfl',
                            'MLB': 'baseball_mlb',
                        };
                        sportKey = sportKeyMap[sport];
                        if (!sportKey) {
                            result.errors.push("Sport ".concat(sport, " not supported by The Odds API"));
                            return [2 /*return*/, result];
                        }
                        return [4 /*yield*/, oddsApiClient.getPlayerProps(sportKey)];
                    case 2:
                        response = _a.sent();
                        if (!response.data || response.data.length === 0) {
                            console.log("No games found on The Odds API for ".concat(sport));
                            result.success = true;
                            return [2 /*return*/, result];
                        }
                        normalizedProps = oddsApiClient.normalizeToProps(response.data, sport);
                        result.propsFetched = normalizedProps.length;
                        console.log("Found ".concat(normalizedProps.length, " props from The Odds API"));
                        return [4 /*yield*/, storage.getActivePropIdsBySportAndPlatform(sport, 'The Odds API')];
                    case 3:
                        oldPropIds = _a.sent();
                        console.log("Found ".concat(oldPropIds.length, " existing active The Odds API ").concat(sport, " props to replace"));
                        _i = 0, normalizedProps_3 = normalizedProps;
                        _a.label = 4;
                    case 4:
                        if (!(_i < normalizedProps_3.length)) return [3 /*break*/, 9];
                        rawProp = normalizedProps_3[_i];
                        _a.label = 5;
                    case 5:
                        _a.trys.push([5, 7, , 8]);
                        gameTime = rawProp.gameTime instanceof Date
                            ? rawProp.gameTime
                            : new Date(rawProp.gameTime);
                        basicConfidence = 60 + Math.floor(Math.random() * 16);
                        basicEV = (basicConfidence - 50) / 10;
                        basicProb = basicConfidence / 100;
                        return [4 /*yield*/, storage.createProp({
                                sport: sport,
                                player: rawProp.player,
                                team: rawProp.team,
                                opponent: rawProp.opponent,
                                stat: rawProp.stat,
                                line: rawProp.line,
                                currentLine: rawProp.line,
                                direction: rawProp.direction,
                                period: 'full_game',
                                platform: 'The Odds API',
                                confidence: basicConfidence,
                                ev: basicEV.toFixed(2),
                                modelProbability: basicProb.toFixed(3),
                                gameTime: gameTime,
                                isActive: true,
                            })];
                    case 6:
                        _a.sent();
                        result.propsCreated++;
                        if (result.propsCreated % 100 === 0) {
                            console.log("Created ".concat(result.propsCreated, " The Odds API props..."));
                        }
                        return [3 /*break*/, 8];
                    case 7:
                        error_5 = _a.sent();
                        err = error_5;
                        result.propsSkipped++;
                        result.errors.push("".concat(rawProp.player, ": ").concat(err.message));
                        return [3 /*break*/, 8];
                    case 8:
                        _i++;
                        return [3 /*break*/, 4];
                    case 9:
                        if (!(result.propsCreated > 0 && oldPropIds.length > 0)) return [3 /*break*/, 11];
                        return [4 /*yield*/, storage.deactivateSpecificProps(oldPropIds)];
                    case 10:
                        deactivatedCount = _a.sent();
                        console.log("Deactivated ".concat(deactivatedCount, " old The Odds API ").concat(sport, " props after successfully creating ").concat(result.propsCreated, " new props"));
                        return [3 /*break*/, 12];
                    case 11:
                        if (result.propsCreated === 0) {
                            console.log("No props created for The Odds API ".concat(sport, ", keeping ").concat(oldPropIds.length, " existing props active"));
                        }
                        _a.label = 12;
                    case 12:
                        result.success = true;
                        console.log("The Odds API ".concat(sport, ": Created ").concat(result.propsCreated, "/").concat(result.propsFetched, " props"));
                        return [2 /*return*/, result];
                    case 13:
                        error_6 = _a.sent();
                        err = error_6;
                        console.error('The Odds API fetch error:', err.message);
                        if (err.message.includes('INVALID_MARKET') || err.message.includes('Markets not supported')) {
                            result.errors.push('Player props require paid API tier. Free tier detected.');
                        }
                        else {
                            result.errors.push("API error: ".concat(err.message));
                        }
                        return [2 /*return*/, result];
                    case 14: return [2 /*return*/];
                }
            });
        });
    };
    PropRefreshService.prototype.refreshAllPlatforms = function () {
        return __awaiter(this, arguments, void 0, function (sports) {
            var results, _i, sports_1, sport, prizepicksResult, underdogResult, oddsApiResult, totalPropsFetched, totalPropsCreated, totalErrors, allSuccessful;
            if (sports === void 0) { sports = ['NBA', 'NFL', 'NHL']; }
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        results = [];
                        console.log("Starting multi-platform prop refresh for: ".concat(sports.join(', ')));
                        console.log("Platforms: PrizePicks, Underdog, The Odds API");
                        _i = 0, sports_1 = sports;
                        _a.label = 1;
                    case 1:
                        if (!(_i < sports_1.length)) return [3 /*break*/, 6];
                        sport = sports_1[_i];
                        return [4 /*yield*/, this.refreshFromPrizePicks(sport)];
                    case 2:
                        prizepicksResult = _a.sent();
                        results.push(prizepicksResult);
                        return [4 /*yield*/, this.refreshFromUnderdog(sport)];
                    case 3:
                        underdogResult = _a.sent();
                        results.push(underdogResult);
                        return [4 /*yield*/, this.refreshFromOddsApi(sport)];
                    case 4:
                        oddsApiResult = _a.sent();
                        results.push(oddsApiResult);
                        _a.label = 5;
                    case 5:
                        _i++;
                        return [3 /*break*/, 1];
                    case 6:
                        totalPropsFetched = results.reduce(function (sum, r) { return sum + r.propsFetched; }, 0);
                        totalPropsCreated = results.reduce(function (sum, r) { return sum + r.propsCreated; }, 0);
                        totalErrors = results.reduce(function (sum, r) { return sum + r.errors.length; }, 0);
                        allSuccessful = results.every(function (r) { return r.success; });
                        console.log("\n=== Multi-Platform Refresh Summary ===");
                        console.log("Total props fetched: ".concat(totalPropsFetched));
                        console.log("Total props created: ".concat(totalPropsCreated));
                        console.log("Total errors: ".concat(totalErrors));
                        console.log("========================================\n");
                        return [2 /*return*/, {
                                success: allSuccessful,
                                results: results,
                                totalPropsFetched: totalPropsFetched,
                                totalPropsCreated: totalPropsCreated,
                                totalErrors: totalErrors,
                            }];
                }
            });
        });
    };
    return PropRefreshService;
}());
export { PropRefreshService };
export var propRefreshService = new PropRefreshService();
