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
var ESPN_RATE_LIMIT = {
    provider: "espn_scoreboard",
    requestsPerMinute: 30,
    requestsPerHour: 1000,
    requestsPerDay: 5000,
};
var ScoreboardClient = /** @class */ (function (_super) {
    __extends(ScoreboardClient, _super);
    function ScoreboardClient() {
        return _super.call(this, "https://site.api.espn.com/apis/site/v2/sports", ESPN_RATE_LIMIT) || this;
    }
    ScoreboardClient.prototype.getNBAScores = function (date) {
        return __awaiter(this, void 0, void 0, function () {
            var dateStr, response, error_1;
            var _a;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        _b.trys.push([0, 2, , 3]);
                        dateStr = date ? this.formatDate(date) : this.formatDate(new Date());
                        return [4 /*yield*/, this.get("/basketball/nba/scoreboard?dates=".concat(dateStr))];
                    case 1:
                        response = _b.sent();
                        if (!((_a = response === null || response === void 0 ? void 0 : response.data) === null || _a === void 0 ? void 0 : _a.events))
                            return [2 /*return*/, []];
                        return [2 /*return*/, response.data.events.map(function (event) {
                                var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o, _p, _q, _r, _s, _t;
                                return ({
                                    gameId: event.id,
                                    sport: "NBA",
                                    homeTeam: ((_d = (_c = (_b = (_a = event.competitions[0]) === null || _a === void 0 ? void 0 : _a.competitors) === null || _b === void 0 ? void 0 : _b.find(function (c) { return c.homeAway === "home"; })) === null || _c === void 0 ? void 0 : _c.team) === null || _d === void 0 ? void 0 : _d.displayName) || "",
                                    awayTeam: ((_h = (_g = (_f = (_e = event.competitions[0]) === null || _e === void 0 ? void 0 : _e.competitors) === null || _f === void 0 ? void 0 : _f.find(function (c) { return c.homeAway === "away"; })) === null || _g === void 0 ? void 0 : _g.team) === null || _h === void 0 ? void 0 : _h.displayName) || "",
                                    homeScore: parseInt(((_l = (_k = (_j = event.competitions[0]) === null || _j === void 0 ? void 0 : _j.competitors) === null || _k === void 0 ? void 0 : _k.find(function (c) { return c.homeAway === "home"; })) === null || _l === void 0 ? void 0 : _l.score) || "0"),
                                    awayScore: parseInt(((_p = (_o = (_m = event.competitions[0]) === null || _m === void 0 ? void 0 : _m.competitors) === null || _o === void 0 ? void 0 : _o.find(function (c) { return c.homeAway === "away"; })) === null || _p === void 0 ? void 0 : _p.score) || "0"),
                                    status: ((_r = (_q = event.status) === null || _q === void 0 ? void 0 : _q.type) === null || _r === void 0 ? void 0 : _r.completed) ? "final" : ((_t = (_s = event.status) === null || _s === void 0 ? void 0 : _s.type) === null || _t === void 0 ? void 0 : _t.state) === "in" ? "in_progress" : "scheduled",
                                    gameTime: new Date(event.date),
                                    playerStats: {},
                                });
                            })];
                    case 2:
                        error_1 = _b.sent();
                        console.error("Error fetching NBA scores:", error_1);
                        return [2 /*return*/, []];
                    case 3: return [2 /*return*/];
                }
            });
        });
    };
    ScoreboardClient.prototype.getNHLScores = function (date) {
        return __awaiter(this, void 0, void 0, function () {
            var dateStr, response, error_2;
            var _a;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        _b.trys.push([0, 2, , 3]);
                        dateStr = date ? this.formatDate(date) : this.formatDate(new Date());
                        return [4 /*yield*/, this.get("/hockey/nhl/scoreboard?dates=".concat(dateStr))];
                    case 1:
                        response = _b.sent();
                        if (!((_a = response === null || response === void 0 ? void 0 : response.data) === null || _a === void 0 ? void 0 : _a.events))
                            return [2 /*return*/, []];
                        return [2 /*return*/, response.data.events.map(function (event) {
                                var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o, _p, _q, _r, _s, _t;
                                return ({
                                    gameId: event.id,
                                    sport: "NHL",
                                    homeTeam: ((_d = (_c = (_b = (_a = event.competitions[0]) === null || _a === void 0 ? void 0 : _a.competitors) === null || _b === void 0 ? void 0 : _b.find(function (c) { return c.homeAway === "home"; })) === null || _c === void 0 ? void 0 : _c.team) === null || _d === void 0 ? void 0 : _d.displayName) || "",
                                    awayTeam: ((_h = (_g = (_f = (_e = event.competitions[0]) === null || _e === void 0 ? void 0 : _e.competitors) === null || _f === void 0 ? void 0 : _f.find(function (c) { return c.homeAway === "away"; })) === null || _g === void 0 ? void 0 : _g.team) === null || _h === void 0 ? void 0 : _h.displayName) || "",
                                    homeScore: parseInt(((_l = (_k = (_j = event.competitions[0]) === null || _j === void 0 ? void 0 : _j.competitors) === null || _k === void 0 ? void 0 : _k.find(function (c) { return c.homeAway === "home"; })) === null || _l === void 0 ? void 0 : _l.score) || "0"),
                                    awayScore: parseInt(((_p = (_o = (_m = event.competitions[0]) === null || _m === void 0 ? void 0 : _m.competitors) === null || _o === void 0 ? void 0 : _o.find(function (c) { return c.homeAway === "away"; })) === null || _p === void 0 ? void 0 : _p.score) || "0"),
                                    status: ((_r = (_q = event.status) === null || _q === void 0 ? void 0 : _q.type) === null || _r === void 0 ? void 0 : _r.completed) ? "final" : ((_t = (_s = event.status) === null || _s === void 0 ? void 0 : _s.type) === null || _t === void 0 ? void 0 : _t.state) === "in" ? "in_progress" : "scheduled",
                                    gameTime: new Date(event.date),
                                    playerStats: {},
                                });
                            })];
                    case 2:
                        error_2 = _b.sent();
                        console.error("Error fetching NHL scores:", error_2);
                        return [2 /*return*/, []];
                    case 3: return [2 /*return*/];
                }
            });
        });
    };
    ScoreboardClient.prototype.getNFLScores = function (date) {
        return __awaiter(this, void 0, void 0, function () {
            var dateStr, response, error_3;
            var _a;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        _b.trys.push([0, 2, , 3]);
                        dateStr = date ? this.formatDate(date) : this.formatDate(new Date());
                        return [4 /*yield*/, this.get("/football/nfl/scoreboard?dates=".concat(dateStr))];
                    case 1:
                        response = _b.sent();
                        if (!((_a = response === null || response === void 0 ? void 0 : response.data) === null || _a === void 0 ? void 0 : _a.events))
                            return [2 /*return*/, []];
                        return [2 /*return*/, response.data.events.map(function (event) {
                                var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o, _p, _q, _r, _s, _t;
                                return ({
                                    gameId: event.id,
                                    sport: "NFL",
                                    homeTeam: ((_d = (_c = (_b = (_a = event.competitions[0]) === null || _a === void 0 ? void 0 : _a.competitors) === null || _b === void 0 ? void 0 : _b.find(function (c) { return c.homeAway === "home"; })) === null || _c === void 0 ? void 0 : _c.team) === null || _d === void 0 ? void 0 : _d.displayName) || "",
                                    awayTeam: ((_h = (_g = (_f = (_e = event.competitions[0]) === null || _e === void 0 ? void 0 : _e.competitors) === null || _f === void 0 ? void 0 : _f.find(function (c) { return c.homeAway === "away"; })) === null || _g === void 0 ? void 0 : _g.team) === null || _h === void 0 ? void 0 : _h.displayName) || "",
                                    homeScore: parseInt(((_l = (_k = (_j = event.competitions[0]) === null || _j === void 0 ? void 0 : _j.competitors) === null || _k === void 0 ? void 0 : _k.find(function (c) { return c.homeAway === "home"; })) === null || _l === void 0 ? void 0 : _l.score) || "0"),
                                    awayScore: parseInt(((_p = (_o = (_m = event.competitions[0]) === null || _m === void 0 ? void 0 : _m.competitors) === null || _o === void 0 ? void 0 : _o.find(function (c) { return c.homeAway === "away"; })) === null || _p === void 0 ? void 0 : _p.score) || "0"),
                                    status: ((_r = (_q = event.status) === null || _q === void 0 ? void 0 : _q.type) === null || _r === void 0 ? void 0 : _r.completed) ? "final" : ((_t = (_s = event.status) === null || _s === void 0 ? void 0 : _s.type) === null || _t === void 0 ? void 0 : _t.state) === "in" ? "in_progress" : "scheduled",
                                    gameTime: new Date(event.date),
                                    playerStats: {},
                                });
                            })];
                    case 2:
                        error_3 = _b.sent();
                        console.error("Error fetching NFL scores:", error_3);
                        return [2 /*return*/, []];
                    case 3: return [2 /*return*/];
                }
            });
        });
    };
    ScoreboardClient.prototype.getMLBScores = function (date) {
        return __awaiter(this, void 0, void 0, function () {
            var dateStr, response, error_4;
            var _a;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        _b.trys.push([0, 2, , 3]);
                        dateStr = date ? this.formatDate(date) : this.formatDate(new Date());
                        return [4 /*yield*/, this.get("/baseball/mlb/scoreboard?dates=".concat(dateStr))];
                    case 1:
                        response = _b.sent();
                        if (!((_a = response === null || response === void 0 ? void 0 : response.data) === null || _a === void 0 ? void 0 : _a.events))
                            return [2 /*return*/, []];
                        return [2 /*return*/, response.data.events.map(function (event) {
                                var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o, _p, _q, _r, _s, _t;
                                return ({
                                    gameId: event.id,
                                    sport: "MLB",
                                    homeTeam: ((_d = (_c = (_b = (_a = event.competitions[0]) === null || _a === void 0 ? void 0 : _a.competitors) === null || _b === void 0 ? void 0 : _b.find(function (c) { return c.homeAway === "home"; })) === null || _c === void 0 ? void 0 : _c.team) === null || _d === void 0 ? void 0 : _d.displayName) || "",
                                    awayTeam: ((_h = (_g = (_f = (_e = event.competitions[0]) === null || _e === void 0 ? void 0 : _e.competitors) === null || _f === void 0 ? void 0 : _f.find(function (c) { return c.homeAway === "away"; })) === null || _g === void 0 ? void 0 : _g.team) === null || _h === void 0 ? void 0 : _h.displayName) || "",
                                    homeScore: parseInt(((_l = (_k = (_j = event.competitions[0]) === null || _j === void 0 ? void 0 : _j.competitors) === null || _k === void 0 ? void 0 : _k.find(function (c) { return c.homeAway === "home"; })) === null || _l === void 0 ? void 0 : _l.score) || "0"),
                                    awayScore: parseInt(((_p = (_o = (_m = event.competitions[0]) === null || _m === void 0 ? void 0 : _m.competitors) === null || _o === void 0 ? void 0 : _o.find(function (c) { return c.homeAway === "away"; })) === null || _p === void 0 ? void 0 : _p.score) || "0"),
                                    status: ((_r = (_q = event.status) === null || _q === void 0 ? void 0 : _q.type) === null || _r === void 0 ? void 0 : _r.completed) ? "final" : ((_t = (_s = event.status) === null || _s === void 0 ? void 0 : _s.type) === null || _t === void 0 ? void 0 : _t.state) === "in" ? "in_progress" : "scheduled",
                                    gameTime: new Date(event.date),
                                    playerStats: {},
                                });
                            })];
                    case 2:
                        error_4 = _b.sent();
                        console.error("Error fetching MLB scores:", error_4);
                        return [2 /*return*/, []];
                    case 3: return [2 /*return*/];
                }
            });
        });
    };
    ScoreboardClient.prototype.getScoresBySport = function (sport, date) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (sport.toUpperCase()) {
                    case "NBA":
                        return [2 /*return*/, this.getNBAScores(date)];
                    case "NHL":
                        return [2 /*return*/, this.getNHLScores(date)];
                    case "NFL":
                        return [2 /*return*/, this.getNFLScores(date)];
                    case "MLB":
                        return [2 /*return*/, this.getMLBScores(date)];
                    default:
                        console.warn("Unknown sport: ".concat(sport));
                        return [2 /*return*/, []];
                }
                return [2 /*return*/];
            });
        });
    };
    ScoreboardClient.prototype.formatDate = function (date) {
        return date.toISOString().split("T")[0].replace(/-/g, "");
    };
    return ScoreboardClient;
}(IntegrationClient));
export var scoreboardClient = new ScoreboardClient();
