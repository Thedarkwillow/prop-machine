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
var PropComparisonService = /** @class */ (function () {
    function PropComparisonService() {
    }
    /**
     * Compare same prop across platforms
     */
    PropComparisonService.prototype.comparePropsAcrossPlatforms = function (player, stat) {
        return __awaiter(this, void 0, void 0, function () {
            var allProps, matchingProps, overProps, underProps, propsToCompare, direction, platforms, bestLine, worstLine, lineSpread, recommendation;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, storage.getAllActiveProps()];
                    case 1:
                        allProps = _a.sent();
                        matchingProps = allProps.filter(function (p) { return p.player.toLowerCase() === player.toLowerCase() &&
                            p.stat.toLowerCase() === stat.toLowerCase(); });
                        if (matchingProps.length === 0) {
                            return [2 /*return*/, null];
                        }
                        overProps = matchingProps.filter(function (p) { return p.direction === 'over'; });
                        underProps = matchingProps.filter(function (p) { return p.direction === 'under'; });
                        propsToCompare = overProps.length >= underProps.length ? overProps : underProps;
                        direction = overProps.length >= underProps.length ? 'over' : 'under';
                        if (propsToCompare.length === 0) {
                            return [2 /*return*/, null];
                        }
                        platforms = propsToCompare.map(function (p) { return ({
                            platform: p.platform,
                            line: parseFloat(p.line),
                            direction: p.direction,
                            confidence: p.confidence,
                            ev: p.ev,
                            propId: p.id,
                        }); });
                        // Sort by line (best line for over is lowest, for under is highest)
                        platforms.sort(function (a, b) {
                            return direction === 'over' ? a.line - b.line : b.line - a.line;
                        });
                        bestLine = platforms[0].line;
                        worstLine = platforms[platforms.length - 1].line;
                        lineSpread = Math.abs(bestLine - worstLine);
                        recommendation = '';
                        if (lineSpread >= 1.0) {
                            recommendation = "Significant ".concat(lineSpread.toFixed(1), " point advantage on ").concat(platforms[0].platform);
                        }
                        else if (lineSpread >= 0.5) {
                            recommendation = "".concat(platforms[0].platform, " offers best value");
                        }
                        else {
                            recommendation = 'Lines are similar across platforms';
                        }
                        return [2 /*return*/, {
                                player: propsToCompare[0].player,
                                stat: propsToCompare[0].stat,
                                bestLine: bestLine,
                                platforms: platforms,
                                lineSpread: lineSpread,
                                recommendation: recommendation,
                            }];
                }
            });
        });
    };
    /**
     * Find arbitrage opportunities (rare but possible)
     */
    PropComparisonService.prototype.findArbitrageOpportunities = function () {
        return __awaiter(this, void 0, void 0, function () {
            var allProps, opportunities, grouped, _i, allProps_1, prop, key, _a, _b, _c, key, props, overProps, underProps, bestOver, bestUnder;
            return __generator(this, function (_d) {
                switch (_d.label) {
                    case 0: return [4 /*yield*/, storage.getAllActiveProps()];
                    case 1:
                        allProps = _d.sent();
                        opportunities = [];
                        grouped = new Map();
                        for (_i = 0, allProps_1 = allProps; _i < allProps_1.length; _i++) {
                            prop = allProps_1[_i];
                            key = "".concat(prop.player, "-").concat(prop.stat);
                            if (!grouped.has(key)) {
                                grouped.set(key, []);
                            }
                            grouped.get(key).push(prop);
                        }
                        // Look for arbitrage opportunities
                        for (_a = 0, _b = grouped.entries(); _a < _b.length; _a++) {
                            _c = _b[_a], key = _c[0], props = _c[1];
                            overProps = props.filter(function (p) { return p.direction === 'over'; });
                            underProps = props.filter(function (p) { return p.direction === 'under'; });
                            if (overProps.length > 0 && underProps.length > 0) {
                                bestOver = overProps.reduce(function (best, p) {
                                    return parseFloat(p.line) < parseFloat(best.line) ? p : best;
                                });
                                bestUnder = underProps.reduce(function (best, p) {
                                    return parseFloat(p.line) > parseFloat(best.line) ? p : best;
                                });
                                // Check if there's an arbitrage window
                                if (parseFloat(bestOver.line) > parseFloat(bestUnder.line)) {
                                    opportunities.push({
                                        player: bestOver.player,
                                        stat: bestOver.stat,
                                        overPlatform: bestOver.platform,
                                        overLine: bestOver.line,
                                        underPlatform: bestUnder.platform,
                                        underLine: bestUnder.line,
                                        window: parseFloat(bestOver.line) - parseFloat(bestUnder.line),
                                    });
                                }
                            }
                        }
                        return [2 /*return*/, opportunities];
                }
            });
        });
    };
    /**
     * Get best available lines for a player across all stats
     */
    PropComparisonService.prototype.getBestLinesForPlayer = function (playerName) {
        return __awaiter(this, void 0, void 0, function () {
            var allProps, playerProps, bystat, _i, playerProps_1, prop, results, _a, _b, _c, stat, props, comparison;
            return __generator(this, function (_d) {
                switch (_d.label) {
                    case 0: return [4 /*yield*/, storage.getAllActiveProps()];
                    case 1:
                        allProps = _d.sent();
                        playerProps = allProps.filter(function (p) { return p.player.toLowerCase() === playerName.toLowerCase(); });
                        bystat = new Map();
                        for (_i = 0, playerProps_1 = playerProps; _i < playerProps_1.length; _i++) {
                            prop = playerProps_1[_i];
                            if (!bystat.has(prop.stat)) {
                                bystat.set(prop.stat, []);
                            }
                            bystat.get(prop.stat).push(prop);
                        }
                        results = [];
                        _a = 0, _b = bystat.entries();
                        _d.label = 2;
                    case 2:
                        if (!(_a < _b.length)) return [3 /*break*/, 5];
                        _c = _b[_a], stat = _c[0], props = _c[1];
                        return [4 /*yield*/, this.comparePropsAcrossPlatforms(playerName, stat)];
                    case 3:
                        comparison = _d.sent();
                        if (comparison) {
                            results.push(comparison);
                        }
                        _d.label = 4;
                    case 4:
                        _a++;
                        return [3 /*break*/, 2];
                    case 5: return [2 /*return*/, results];
                }
            });
        });
    };
    return PropComparisonService;
}());
export { PropComparisonService };
export var propComparisonService = new PropComparisonService();
