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
var UNDERDOG_RATE_LIMIT = {
    provider: "underdog",
    requestsPerMinute: 30,
    requestsPerHour: 500,
    requestsPerDay: 5000,
};
// Sport IDs from Underdog
var SPORT_IDS = {
    NBA: 2,
    NFL: 1,
    NHL: 3,
    MLB: 4,
};
// Stat type normalization
var STAT_NAME_MAP = {
    'passing_yards': 'Pass Yards',
    'rushing_yards': 'Rush Yards',
    'receiving_yards': 'Rec Yards',
    'receptions': 'Receptions',
    'passing_tds': 'Pass TDs',
    'rushing_tds': 'Rush TDs',
    'receiving_tds': 'Rec TDs',
    'points': 'Points',
    'rebounds': 'Rebounds',
    'assists': 'Assists',
    'threes': '3PM',
    '3-pointers_made': '3PM',
    'steals': 'Steals',
    'blocks': 'Blocks',
    'goals': 'Goals',
    'shots_on_goal': 'SOG',
    'saves': 'Saves',
    'fantasy_points': 'Fantasy Points',
    'pts+rebs+asts': 'PTS+REB+AST',
    'pts+rebs': 'PTS+REB',
    'pts+asts': 'PTS+AST',
};
var UnderdogClient = /** @class */ (function (_super) {
    __extends(UnderdogClient, _super);
    function UnderdogClient() {
        return _super.call(this, "https://api.underdogfantasy.com/v1", UNDERDOG_RATE_LIMIT) || this;
    }
    UnderdogClient.prototype.getAppearances = function () {
        return __awaiter(this, arguments, void 0, function (sport) {
            var sportId, params, response, error_1;
            if (sport === void 0) { sport = "NBA"; }
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        sportId = SPORT_IDS[sport] || SPORT_IDS['NBA'];
                        params = new URLSearchParams({
                            sport_id: sportId.toString(),
                            status: 'upcoming',
                        });
                        _a.label = 1;
                    case 1:
                        _a.trys.push([1, 3, , 4]);
                        return [4 /*yield*/, this.get("/appearances?".concat(params.toString()))];
                    case 2:
                        response = _a.sent();
                        return [2 /*return*/, (response === null || response === void 0 ? void 0 : response.data) || { appearances: [] }];
                    case 3:
                        error_1 = _a.sent();
                        console.error('Underdog API error:', error_1);
                        return [2 /*return*/, { appearances: [] }];
                    case 4: return [2 /*return*/];
                }
            });
        });
    };
    UnderdogClient.prototype.normalizeStatType = function (statType) {
        var normalized = statType.toLowerCase().replace(/\s+/g, '_');
        return STAT_NAME_MAP[normalized] || statType;
    };
    UnderdogClient.prototype.normalizeToProps = function (response, sport) {
        var _a, _b, _c, _d;
        var props = [];
        // Build lookup maps
        var players = new Map();
        var matches = new Map();
        var teams = new Map();
        if (response.players) {
            for (var _i = 0, _e = response.players; _i < _e.length; _i++) {
                var player = _e[_i];
                players.set(player.id, player);
            }
        }
        if (response.matches) {
            for (var _f = 0, _g = response.matches; _f < _g.length; _f++) {
                var match = _g[_f];
                matches.set(match.id, match);
            }
        }
        if (response.teams) {
            for (var _h = 0, _j = response.teams; _h < _j.length; _h++) {
                var team = _j[_h];
                teams.set(team.id, team);
            }
        }
        // Process each appearance
        for (var _k = 0, _l = response.appearances; _k < _l.length; _k++) {
            var appearance = _l[_k];
            if (appearance.status !== 'active')
                continue;
            var player = players.get(appearance.player_id);
            var match = matches.get(appearance.match_id);
            if (!player || !match)
                continue;
            var team = teams.get(player.team_id);
            var homeTeam = teams.get(match.home_team_id);
            var awayTeam = teams.get(match.away_team_id);
            // Determine opponent
            var opponent = '';
            if (team && homeTeam && awayTeam) {
                opponent = team.id === homeTeam.id ? awayTeam.abbreviation : homeTeam.abbreviation;
            }
            var statValue = (_b = (_a = appearance.over_under) === null || _a === void 0 ? void 0 : _a.appearance_stat) === null || _b === void 0 ? void 0 : _b.stat_value;
            var displayStat = (_d = (_c = appearance.over_under) === null || _c === void 0 ? void 0 : _c.appearance_stat) === null || _d === void 0 ? void 0 : _d.display_stat;
            if (!statValue || !displayStat)
                continue;
            var normalizedStat = this.normalizeStatType(displayStat);
            var playerName = "".concat(player.first_name, " ").concat(player.last_name);
            // Create both over and under props
            props.push({
                player: playerName,
                team: (team === null || team === void 0 ? void 0 : team.abbreviation) || '',
                opponent: opponent,
                stat: normalizedStat,
                line: statValue.toString(),
                direction: 'over',
                period: 'full_game', // Underdog typically doesn't specify quarters
                gameTime: new Date(appearance.scheduled_at),
                platform: 'Underdog',
            });
            props.push({
                player: playerName,
                team: (team === null || team === void 0 ? void 0 : team.abbreviation) || '',
                opponent: opponent,
                stat: normalizedStat,
                line: statValue.toString(),
                direction: 'under',
                period: 'full_game',
                gameTime: new Date(appearance.scheduled_at),
                platform: 'Underdog',
            });
        }
        return props;
    };
    return UnderdogClient;
}(IntegrationClient));
export var underdogClient = new UnderdogClient();
