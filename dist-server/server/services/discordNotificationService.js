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
var DiscordNotificationService = /** @class */ (function () {
    function DiscordNotificationService() {
    }
    /**
     * Send a notification to Discord webhook
     */
    DiscordNotificationService.prototype.sendWebhook = function (webhookUrl, embeds) {
        return __awaiter(this, void 0, void 0, function () {
            var response, error_1;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 2, , 3]);
                        return [4 /*yield*/, fetch(webhookUrl, {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ embeds: embeds }),
                            })];
                    case 1:
                        response = _a.sent();
                        if (!response.ok) {
                            console.error('[Discord] Webhook failed:', response.status, response.statusText);
                        }
                        return [3 /*break*/, 3];
                    case 2:
                        error_1 = _a.sent();
                        console.error('[Discord] Failed to send webhook:', error_1);
                        return [3 /*break*/, 3];
                    case 3: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Notify user about new high-confidence props
     */
    DiscordNotificationService.prototype.notifyNewProps = function (userId, props) {
        return __awaiter(this, void 0, void 0, function () {
            var settings, qualifyingProps, embeds;
            var _this = this;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, storage.getDiscordSettings(userId)];
                    case 1:
                        settings = _a.sent();
                        if (!settings || !settings.enabled || !settings.notifyNewProps) {
                            return [2 /*return*/];
                        }
                        qualifyingProps = props.filter(function (p) { return p.confidence >= settings.minConfidence; });
                        if (qualifyingProps.length === 0)
                            return [2 /*return*/];
                        embeds = qualifyingProps.slice(0, 10).map(function (prop) { return ({
                            title: "New ".concat(prop.sport, " Prop"),
                            color: _this.getColorByConfidence(prop.confidence),
                            fields: [
                                { name: 'Player', value: prop.player, inline: true },
                                { name: 'Matchup', value: "".concat(prop.team, " vs ").concat(prop.opponent), inline: true },
                                { name: 'Prop', value: "".concat(prop.stat, " ").concat(prop.direction, " ").concat(prop.line), inline: false },
                                { name: 'Confidence', value: "".concat(prop.confidence, "%"), inline: true },
                                { name: 'EV', value: "".concat(prop.ev, "%"), inline: true },
                                { name: 'Platform', value: prop.platform, inline: true },
                            ],
                            timestamp: new Date().toISOString(),
                            footer: { text: "Prop Machine \u2022 ".concat(prop.sport) },
                        }); });
                        return [4 /*yield*/, this.sendWebhook(settings.webhookUrl, embeds)];
                    case 2:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Notify about line movements
     */
    DiscordNotificationService.prototype.notifyLineMovement = function (userId, prop, oldLine, newLine) {
        return __awaiter(this, void 0, void 0, function () {
            var settings, movement, isSteamMove, embed;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, storage.getDiscordSettings(userId)];
                    case 1:
                        settings = _a.sent();
                        if (!settings || !settings.enabled || !settings.notifyLineMovements) {
                            return [2 /*return*/];
                        }
                        movement = newLine - oldLine;
                        isSteamMove = Math.abs(movement) >= 1.0;
                        if (!isSteamMove)
                            return [2 /*return*/]; // Only notify on significant moves
                        embed = {
                            title: "".concat(isSteamMove ? 'STEAM MOVE' : 'Line Movement'),
                            description: "".concat(prop.player, " - ").concat(prop.stat),
                            color: movement > 0 ? 0x00ff00 : 0xff0000, // Green up, red down
                            fields: [
                                { name: 'Sport', value: prop.sport, inline: true },
                                { name: 'Platform', value: prop.platform, inline: true },
                                { name: 'Matchup', value: "".concat(prop.team, " vs ").concat(prop.opponent), inline: false },
                                { name: 'Line Movement', value: "".concat(oldLine, " \u2192 ").concat(newLine, " (").concat(movement > 0 ? '+' : '').concat(movement, ")"), inline: false },
                                { name: 'Confidence', value: "".concat(prop.confidence, "%"), inline: true },
                            ],
                            timestamp: new Date().toISOString(),
                        };
                        return [4 /*yield*/, this.sendWebhook(settings.webhookUrl, [embed])];
                    case 2:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Notify about bet settlement
     */
    DiscordNotificationService.prototype.notifyBetSettlement = function (userId, bet, outcome, profitLoss) {
        return __awaiter(this, void 0, void 0, function () {
            var settings, color, embed;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, storage.getDiscordSettings(userId)];
                    case 1:
                        settings = _a.sent();
                        if (!settings || !settings.enabled || !settings.notifyBetSettlement) {
                            return [2 /*return*/];
                        }
                        color = outcome === 'won' ? 0x00ff00 : outcome === 'lost' ? 0xff0000 : 0xffa500;
                        embed = {
                            title: "Bet ".concat(outcome.toUpperCase()),
                            color: color,
                            fields: [
                                { name: 'Amount', value: "$".concat(parseFloat(bet.amount).toFixed(2)), inline: true },
                                { name: 'Result', value: outcome === 'won' ? "+$".concat(profitLoss.toFixed(2)) : outcome === 'lost' ? "-$".concat(Math.abs(profitLoss).toFixed(2)) : 'Push', inline: true },
                                { name: 'Odds', value: bet.odds.toString(), inline: true },
                            ],
                            timestamp: new Date().toISOString(),
                            footer: { text: 'Prop Machine' },
                        };
                        return [4 /*yield*/, this.sendWebhook(settings.webhookUrl, [embed])];
                    case 2:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Get embed color based on confidence
     */
    DiscordNotificationService.prototype.getColorByConfidence = function (confidence) {
        if (confidence >= 80)
            return 0x00ff00; // Green
        if (confidence >= 70)
            return 0xffa500; // Orange
        return 0xff0000; // Red
    };
    return DiscordNotificationService;
}());
export { DiscordNotificationService };
export var discordNotificationService = new DiscordNotificationService();
