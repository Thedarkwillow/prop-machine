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
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
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
var PRIZEPICKS_RATE_LIMIT = {
    provider: "prizepicks",
    requestsPerMinute: 30,
    requestsPerHour: 500,
    requestsPerDay: 5000,
};
// League IDs from PrizePicks
var LEAGUE_IDS = {
    NBA: 7,
    NFL: 9,
    NHL: 6,
    MLB: 2,
};
// Period type mapping
var PERIOD_TYPE_MAP = {
    '1q': '1Q',
    '1h': '1H',
    '2h': '2H',
    '4q': '4Q',
    'game': 'full_game',
};
var PrizePicksClient = /** @class */ (function (_super) {
    __extends(PrizePicksClient, _super);
    function PrizePicksClient() {
        return _super.call(this, "https://api.prizepicks.com", PRIZEPICKS_RATE_LIMIT) || this;
    }
    PrizePicksClient.prototype.getProjections = function () {
        return __awaiter(this, arguments, void 0, function (sport) {
            var leagueId, params, response;
            if (sport === void 0) { sport = "NBA"; }
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        leagueId = LEAGUE_IDS[sport] || LEAGUE_IDS['NBA'];
                        params = new URLSearchParams({
                            league_id: leagueId.toString(),
                            per_page: '250',
                            single_stat: 'true',
                        });
                        return [4 /*yield*/, this.get("/projections?".concat(params.toString()))];
                    case 1:
                        response = _a.sent();
                        return [2 /*return*/, (response === null || response === void 0 ? void 0 : response.data) || { data: [], included: [] }];
                }
            });
        });
    };
    PrizePicksClient.prototype.normalizeToProp = function (pick, players, sport) {
        var playerId = pick.relationships.new_player.data.id;
        var player = players.get(playerId);
        if (!player)
            return null;
        // Detect period from stat_type (e.g., "Points 1Q" or "Points 1H")
        var statType = pick.attributes.stat_type;
        var baseStat = statType;
        var period = 'full_game';
        // Check for period suffixes
        var periodMatch = statType.match(/\s+(1Q|1H|2H|4Q)$/i);
        if (periodMatch) {
            period = periodMatch[1].toUpperCase();
            baseStat = statType.replace(/\s+(1Q|1H|2H|4Q)$/i, '').trim();
        }
        return {
            player: player.attributes.name,
            team: player.attributes.team,
            stat: baseStat,
            line: pick.attributes.line_score.toString(),
            period: period,
            gameTime: new Date(pick.attributes.start_time),
            platform: 'PrizePicks',
        };
    };
    PrizePicksClient.prototype.normalizeToProps = function (response, sport) {
        var props = [];
        // Build player map
        var players = new Map();
        for (var _i = 0, _a = response.included; _i < _a.length; _i++) {
            var item = _a[_i];
            if (item.type === 'new_player') {
                players.set(item.id, item);
            }
        }
        // Process each projection
        for (var _b = 0, _c = response.data; _b < _c.length; _b++) {
            var pick = _c[_b];
            // Skip promo picks
            if (pick.attributes.is_promo)
                continue;
            var normalized = this.normalizeToProp(pick, players, sport);
            if (!normalized)
                continue;
            // PrizePicks props are "over" by default
            // We'll create both over and under for consistency
            props.push(__assign(__assign({}, normalized), { opponent: '', direction: 'over' }));
            props.push(__assign(__assign({}, normalized), { opponent: '', direction: 'under' }));
        }
        return props;
    };
    return PrizePicksClient;
}(IntegrationClient));
export var prizepicksClient = new PrizePicksClient();
