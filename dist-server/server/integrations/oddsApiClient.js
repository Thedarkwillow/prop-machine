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
var ODDS_API_RATE_LIMIT = {
    provider: "odds_api",
    requestsPerMinute: 20,
    requestsPerHour: 500,
    requestsPerDay: 500,
};
var OddsApiClient = /** @class */ (function (_super) {
    __extends(OddsApiClient, _super);
    function OddsApiClient() {
        var _this = _super.call(this, "https://api.the-odds-api.com/v4", ODDS_API_RATE_LIMIT) || this;
        _this.apiKey = process.env.ODDS_API_KEY || "";
        if (!_this.apiKey) {
            console.warn("ODDS_API_KEY not set - odds data will be unavailable");
        }
        return _this;
    }
    OddsApiClient.prototype.getUpcomingGames = function () {
        return __awaiter(this, arguments, void 0, function (sport) {
            var params, response;
            if (sport === void 0) { sport = "basketball_nba"; }
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (!this.apiKey) {
                            console.warn("No ODDS_API_KEY configured");
                            return [2 /*return*/, { data: [] }];
                        }
                        params = new URLSearchParams({
                            apiKey: this.apiKey,
                            regions: "us",
                            markets: "h2h,spreads,totals,player_points,player_rebounds,player_assists",
                            oddsFormat: "american",
                        });
                        return [4 /*yield*/, this.get("/sports/".concat(sport, "/odds?").concat(params.toString()))];
                    case 1:
                        response = _a.sent();
                        return [2 /*return*/, { data: (response === null || response === void 0 ? void 0 : response.data) || [] }];
                }
            });
        });
    };
    OddsApiClient.prototype.getUpcomingEvents = function () {
        return __awaiter(this, arguments, void 0, function (sport) {
            var params, response;
            if (sport === void 0) { sport = "basketball_nba"; }
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (!this.apiKey) {
                            console.warn("No ODDS_API_KEY configured");
                            return [2 /*return*/, []];
                        }
                        params = new URLSearchParams({
                            apiKey: this.apiKey,
                        });
                        return [4 /*yield*/, this.get("/sports/".concat(sport, "/events?").concat(params.toString()))];
                    case 1:
                        response = _a.sent();
                        return [2 /*return*/, (response === null || response === void 0 ? void 0 : response.data) || []];
                }
            });
        });
    };
    OddsApiClient.prototype.getPlayerProps = function () {
        return __awaiter(this, arguments, void 0, function (sport, eventId) {
            var events, allGames, eventsToFetch, _i, eventsToFetch_1, event, params_1, response_1, error_1, params, response;
            if (sport === void 0) { sport = "basketball_nba"; }
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (!this.apiKey) {
                            console.warn("No ODDS_API_KEY configured");
                            return [2 /*return*/, { data: [] }];
                        }
                        if (!!eventId) return [3 /*break*/, 8];
                        return [4 /*yield*/, this.getUpcomingEvents(sport)];
                    case 1:
                        events = _a.sent();
                        if (events.length === 0) {
                            console.log("No upcoming events found for ".concat(sport));
                            return [2 /*return*/, { data: [] }];
                        }
                        console.log("Found ".concat(events.length, " upcoming ").concat(sport, " events, fetching player props..."));
                        allGames = [];
                        eventsToFetch = events.slice(0, 10);
                        _i = 0, eventsToFetch_1 = eventsToFetch;
                        _a.label = 2;
                    case 2:
                        if (!(_i < eventsToFetch_1.length)) return [3 /*break*/, 7];
                        event = eventsToFetch_1[_i];
                        _a.label = 3;
                    case 3:
                        _a.trys.push([3, 5, , 6]);
                        params_1 = new URLSearchParams({
                            apiKey: this.apiKey,
                            regions: "us",
                            markets: "player_points,player_rebounds,player_assists,player_threes,player_blocks,player_steals",
                            oddsFormat: "american",
                        });
                        return [4 /*yield*/, this.get("/sports/".concat(sport, "/events/").concat(event.id, "/odds?").concat(params_1.toString()))];
                    case 4:
                        response_1 = _a.sent();
                        if (response_1 === null || response_1 === void 0 ? void 0 : response_1.data) {
                            allGames.push(response_1.data);
                        }
                        return [3 /*break*/, 6];
                    case 5:
                        error_1 = _a.sent();
                        console.error("Error fetching props for event ".concat(event.id, ":"), error_1);
                        return [3 /*break*/, 6];
                    case 6:
                        _i++;
                        return [3 /*break*/, 2];
                    case 7: return [2 /*return*/, { data: allGames }];
                    case 8:
                        params = new URLSearchParams({
                            apiKey: this.apiKey,
                            regions: "us",
                            markets: "player_points,player_rebounds,player_assists,player_threes,player_blocks,player_steals",
                            oddsFormat: "american",
                        });
                        return [4 /*yield*/, this.get("/sports/".concat(sport, "/events/").concat(eventId, "/odds?").concat(params.toString()))];
                    case 9:
                        response = _a.sent();
                        return [2 /*return*/, { data: (response === null || response === void 0 ? void 0 : response.data) ? [response.data] : [] }];
                }
            });
        });
    };
    OddsApiClient.prototype.getSportsList = function () {
        return __awaiter(this, void 0, void 0, function () {
            var params, response;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (!this.apiKey) {
                            return [2 /*return*/, []];
                        }
                        params = new URLSearchParams({
                            apiKey: this.apiKey,
                        });
                        return [4 /*yield*/, this.get("/sports?".concat(params.toString()))];
                    case 1:
                        response = _a.sent();
                        return [2 /*return*/, (response === null || response === void 0 ? void 0 : response.data) || []];
                }
            });
        });
    };
    OddsApiClient.prototype.normalizeToProps = function (games, sport) {
        var props = [];
        for (var _i = 0, games_1 = games; _i < games_1.length; _i++) {
            var game = games_1[_i];
            var gameTime = new Date(game.commence_time);
            for (var _a = 0, _b = game.bookmakers; _a < _b.length; _a++) {
                var bookmaker = _b[_a];
                for (var _c = 0, _d = bookmaker.markets; _c < _d.length; _c++) {
                    var market = _d[_c];
                    // Only process player prop markets
                    if (!market.key.startsWith("player_"))
                        continue;
                    var stat = market.key.replace("player_", "");
                    var statName = stat.charAt(0).toUpperCase() + stat.slice(1);
                    for (var _e = 0, _f = market.outcomes; _e < _f.length; _e++) {
                        var outcome = _f[_e];
                        if (!outcome.point)
                            continue; // Skip if no line
                        // Create both over and under props
                        // Note: Using "The Odds API" as platform since we aggregate from multiple bookmakers
                        props.push({
                            player: outcome.name,
                            team: outcome.description || game.home_team,
                            opponent: game.away_team,
                            stat: statName,
                            line: outcome.point.toString(),
                            direction: "over",
                            platform: "The Odds API",
                            gameTime: gameTime,
                            odds: outcome.price,
                        });
                        props.push({
                            player: outcome.name,
                            team: outcome.description || game.home_team,
                            opponent: game.away_team,
                            stat: statName,
                            line: outcome.point.toString(),
                            direction: "under",
                            platform: "The Odds API",
                            gameTime: gameTime,
                            odds: outcome.price,
                        });
                    }
                }
            }
        }
        return props;
    };
    return OddsApiClient;
}(IntegrationClient));
export var oddsApiClient = new OddsApiClient();
