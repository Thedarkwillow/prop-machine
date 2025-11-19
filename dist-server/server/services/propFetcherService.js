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
import { oddsApiClient } from "../integrations/oddsApiClient";
import { propAnalysisService } from "./propAnalysisService";
import { storage } from "../storage";
var SPORT_KEY_MAP = {
    'NBA': 'basketball_nba',
    'NHL': 'icehockey_nhl',
    'NFL': 'americanfootball_nfl',
    'MLB': 'baseball_mlb',
};
var STAT_TYPE_MAP = {
    // NBA stats
    'player_points': 'Points',
    'player_rebounds': 'Rebounds',
    'player_assists': 'Assists',
    'player_threes': '3PM',
    'player_blocks': 'Blocks',
    'player_steals': 'Steals',
    'pts+ast': 'PTS+AST',
    'pts+reb': 'PTS+REB',
    'pts+reb+ast': 'PTS+REB+AST',
    'reb+ast': 'REB+AST',
    'fantasy_points': 'Fantasy Points',
    'fantasy_score': 'Fantasy Points',
    // NFL stats
    'player_pass_yds': 'Pass Yards',
    'passing_yards': 'Pass Yards',
    'player_pass_tds': 'Pass TDs',
    'passing_touchdowns': 'Pass TDs',
    'pass_attempts': 'Pass Attempts',
    'pass_completions': 'Pass Completions',
    'player_rush_yds': 'Rush Yards',
    'rushing_yards': 'Rush Yards',
    'rushing_attempts': 'Rush Attempts',
    'player_receptions': 'Receptions',
    'receptions': 'Receptions',
    'player_reception_yds': 'Rec Yards',
    'receiving_yards': 'Rec Yards',
    'player_anytime_td': 'Anytime TD',
    'rush+rec_yds': 'Rush+Rec Yards',
    'passing_completions': 'Completions',
    'interceptions': 'Interceptions',
    // NHL stats
    'goals': 'Goals',
    'assists': 'Assists',
    'points': 'Points',
    'shots_on_goal': 'SOG',
    'saves': 'Saves',
    'blocked_shots': 'Blocked Shots',
    'hockey_hits': 'Hits',
    // MLB stats
    'baseball_hits': 'Hits',
    'runs': 'Runs',
    'rbis': 'RBIs',
    'home_runs': 'Home Runs',
    'stolen_bases': 'Stolen Bases',
    'strikeouts': 'Strikeouts',
    'pitcher_strikeouts': 'Pitcher Ks',
    'earned_runs': 'Earned Runs',
};
var PropFetcherService = /** @class */ (function () {
    function PropFetcherService() {
    }
    PropFetcherService.prototype.fetchAndAnalyzeProps = function () {
        return __awaiter(this, arguments, void 0, function (sport) {
            var result, sportKey, response, normalizedProps, _i, normalizedProps_1, rawProp, statType, analysisInput, analysis, gameTime, error_1, err, error_2, err;
            if (sport === void 0) { sport = 'NBA'; }
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        result = {
                            success: false,
                            propsFetched: 0,
                            propsCreated: 0,
                            propsSkipped: 0,
                            errors: [],
                            sport: sport,
                        };
                        if (!process.env.ODDS_API_KEY) {
                            result.errors.push('ODDS_API_KEY environment variable not set');
                            return [2 /*return*/, result];
                        }
                        _a.label = 1;
                    case 1:
                        _a.trys.push([1, 10, , 11]);
                        sportKey = SPORT_KEY_MAP[sport] || SPORT_KEY_MAP['NBA'];
                        console.log("Fetching props for ".concat(sport, " (").concat(sportKey, ")..."));
                        return [4 /*yield*/, oddsApiClient.getPlayerProps(sportKey)];
                    case 2:
                        response = _a.sent();
                        if (!response.data || response.data.length === 0) {
                            console.log("No games found for ".concat(sport));
                            result.success = true;
                            return [2 /*return*/, result];
                        }
                        console.log("Found ".concat(response.data.length, " games with prop markets"));
                        normalizedProps = oddsApiClient.normalizeToProps(response.data, sport);
                        result.propsFetched = normalizedProps.length;
                        console.log("Normalized ".concat(normalizedProps.length, " props from API"));
                        _i = 0, normalizedProps_1 = normalizedProps;
                        _a.label = 3;
                    case 3:
                        if (!(_i < normalizedProps_1.length)) return [3 /*break*/, 9];
                        rawProp = normalizedProps_1[_i];
                        _a.label = 4;
                    case 4:
                        _a.trys.push([4, 7, , 8]);
                        statType = this.mapStatType(rawProp.stat);
                        if (!statType) {
                            result.propsSkipped++;
                            return [3 /*break*/, 8];
                        }
                        analysisInput = {
                            sport: sport,
                            player: rawProp.player,
                            team: rawProp.team,
                            opponent: rawProp.opponent,
                            stat: statType,
                            line: rawProp.line,
                            direction: rawProp.direction,
                            platform: 'The Odds API',
                        };
                        return [4 /*yield*/, propAnalysisService.analyzeProp(analysisInput)];
                    case 5:
                        analysis = _a.sent();
                        gameTime = rawProp.gameTime instanceof Date
                            ? rawProp.gameTime
                            : new Date(rawProp.gameTime);
                        return [4 /*yield*/, storage.createProp({
                                sport: sport,
                                player: rawProp.player,
                                team: rawProp.team,
                                opponent: rawProp.opponent,
                                stat: statType,
                                line: rawProp.line,
                                currentLine: rawProp.line,
                                direction: rawProp.direction,
                                platform: 'The Odds API',
                                confidence: analysis.confidence,
                                ev: analysis.ev.toString(),
                                modelProbability: analysis.modelProbability.toString(),
                                gameTime: gameTime,
                                isActive: true,
                            })];
                    case 6:
                        _a.sent();
                        result.propsCreated++;
                        if (result.propsCreated % 10 === 0) {
                            console.log("Created ".concat(result.propsCreated, " props so far..."));
                        }
                        return [3 /*break*/, 8];
                    case 7:
                        error_1 = _a.sent();
                        err = error_1;
                        result.propsSkipped++;
                        result.errors.push("Failed to analyze prop for ".concat(rawProp.player, ": ").concat(err.message));
                        if (result.errors.length <= 5) {
                            console.error("Error analyzing prop:", err.message);
                        }
                        return [3 /*break*/, 8];
                    case 8:
                        _i++;
                        return [3 /*break*/, 3];
                    case 9:
                        console.log("\nProp Fetch Summary for ".concat(sport, ":\n- Props fetched from API: ").concat(result.propsFetched, "\n- Props created in storage: ").concat(result.propsCreated, "\n- Props skipped: ").concat(result.propsSkipped, "\n- Errors: ").concat(result.errors.length, "\n      "));
                        result.success = true;
                        return [2 /*return*/, result];
                    case 10:
                        error_2 = _a.sent();
                        err = error_2;
                        console.error('Error fetching props:', err.message);
                        // Detect tier limitation errors from The Odds API
                        if (err.message.includes('INVALID_MARKET') ||
                            err.message.includes('Markets not supported')) {
                            console.log('Detected tier limitation: Player props require paid API subscription');
                            result.success = false;
                            result.tierLimited = true;
                            result.errors.push('Automated prop fetching is unavailable. The Odds API free tier does not support player prop markets. Player props (player_points, player_rebounds, etc.) require a paid subscription. Upgrade your API tier at https://the-odds-api.com/liveapi/guides/v4/#overview to enable automated prop fetching.');
                            return [2 /*return*/, result];
                        }
                        // Other API errors
                        result.success = false;
                        result.errors.push("API error: ".concat(err.message));
                        return [2 /*return*/, result];
                    case 11: return [2 /*return*/];
                }
            });
        });
    };
    PropFetcherService.prototype.mapStatType = function (apiStat) {
        var normalized = apiStat.toLowerCase();
        for (var _i = 0, _a = Object.entries(STAT_TYPE_MAP); _i < _a.length; _i++) {
            var _b = _a[_i], apiKey = _b[0], statType = _b[1];
            if (normalized.includes(apiKey.replace('player_', ''))) {
                return statType;
            }
        }
        return STAT_TYPE_MAP[normalized] || null;
    };
    return PropFetcherService;
}());
export { PropFetcherService };
export var propFetcherService = new PropFetcherService();
