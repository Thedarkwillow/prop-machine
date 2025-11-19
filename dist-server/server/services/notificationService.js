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
import { discordNotificationService } from "./discordNotificationService";
var NotificationService = /** @class */ (function () {
    function NotificationService(storage) {
        this.storage = storage;
    }
    NotificationService.prototype.notifyNewProps = function (props) {
        return __awaiter(this, void 0, void 0, function () {
            var allPreferences, newPropsUsers, _i, newPropsUsers_1, prefs, relevantProps, error_1;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (!props || props.length === 0)
                            return [2 /*return*/];
                        _a.label = 1;
                    case 1:
                        _a.trys.push([1, 7, , 8]);
                        return [4 /*yield*/, this.storage.getAllNotificationPreferences()];
                    case 2:
                        allPreferences = _a.sent();
                        newPropsUsers = allPreferences.filter(function (pref) { return pref.newPropsEnabled; });
                        _i = 0, newPropsUsers_1 = newPropsUsers;
                        _a.label = 3;
                    case 3:
                        if (!(_i < newPropsUsers_1.length)) return [3 /*break*/, 6];
                        prefs = newPropsUsers_1[_i];
                        relevantProps = this.filterPropsForUser(props, prefs);
                        if (!(relevantProps.length > 0)) return [3 /*break*/, 5];
                        return [4 /*yield*/, this.createNewPropsNotification(prefs.userId, relevantProps)];
                    case 4:
                        _a.sent();
                        _a.label = 5;
                    case 5:
                        _i++;
                        return [3 /*break*/, 3];
                    case 6: return [3 /*break*/, 8];
                    case 7:
                        error_1 = _a.sent();
                        console.error("Error sending new props notifications:", error_1);
                        return [3 /*break*/, 8];
                    case 8: return [2 /*return*/];
                }
            });
        });
    };
    NotificationService.prototype.notifyHighConfidenceProp = function (prop) {
        return __awaiter(this, void 0, void 0, function () {
            var allPreferences, highConfidenceUsers, _i, highConfidenceUsers_1, prefs, shouldNotify, error_2;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 6, , 7]);
                        return [4 /*yield*/, this.storage.getAllNotificationPreferences()];
                    case 1:
                        allPreferences = _a.sent();
                        highConfidenceUsers = allPreferences.filter(function (pref) { return pref.highConfidenceOnly; });
                        _i = 0, highConfidenceUsers_1 = highConfidenceUsers;
                        _a.label = 2;
                    case 2:
                        if (!(_i < highConfidenceUsers_1.length)) return [3 /*break*/, 5];
                        prefs = highConfidenceUsers_1[_i];
                        if (!(prop.confidence >= prefs.minConfidence)) return [3 /*break*/, 4];
                        shouldNotify = this.shouldNotifyForProp(prop, prefs);
                        if (!shouldNotify) return [3 /*break*/, 4];
                        return [4 /*yield*/, this.createHighConfidenceNotification(prefs.userId, prop)];
                    case 3:
                        _a.sent();
                        _a.label = 4;
                    case 4:
                        _i++;
                        return [3 /*break*/, 2];
                    case 5: return [3 /*break*/, 7];
                    case 6:
                        error_2 = _a.sent();
                        console.error("Error sending high confidence notifications:", error_2);
                        return [3 /*break*/, 7];
                    case 7: return [2 /*return*/];
                }
            });
        });
    };
    NotificationService.prototype.notifyBetSettled = function (userId, betResult) {
        return __awaiter(this, void 0, void 0, function () {
            var notification, bet, error_3;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 5, , 6]);
                        notification = {
                            userId: userId,
                            type: "bet_settled",
                            title: betResult.outcome === "won" ? "Bet Won! 🎉" : betResult.outcome === "lost" ? "Bet Settled" : "Bet Pushed",
                            message: "".concat(betResult.player, " ").concat(betResult.stat, " has settled. ").concat(betResult.outcome === "won" ? "Profit: $".concat(betResult.profit) : betResult.outcome === "lost" ? "Loss: $".concat(betResult.profit) : "Stake returned"),
                            isRead: false,
                        };
                        return [4 /*yield*/, this.storage.createNotification(notification)];
                    case 1:
                        _a.sent();
                        if (!betResult.betId) return [3 /*break*/, 4];
                        return [4 /*yield*/, this.storage.getBet(betResult.betId)];
                    case 2:
                        bet = _a.sent();
                        if (!bet) return [3 /*break*/, 4];
                        return [4 /*yield*/, discordNotificationService.notifyBetSettlement(userId, bet, betResult.outcome, parseFloat(betResult.profit))];
                    case 3:
                        _a.sent();
                        _a.label = 4;
                    case 4: return [3 /*break*/, 6];
                    case 5:
                        error_3 = _a.sent();
                        console.error("Error sending bet settled notification:", error_3);
                        return [3 /*break*/, 6];
                    case 6: return [2 /*return*/];
                }
            });
        });
    };
    NotificationService.prototype.notifyPerformanceAlert = function (userId, alert) {
        return __awaiter(this, void 0, void 0, function () {
            var notification, error_4;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 2, , 3]);
                        notification = {
                            userId: userId,
                            type: "performance_alert",
                            title: "Performance Alert: ".concat(alert.type),
                            message: alert.message,
                            isRead: false,
                        };
                        return [4 /*yield*/, this.storage.createNotification(notification)];
                    case 1:
                        _a.sent();
                        return [3 /*break*/, 3];
                    case 2:
                        error_4 = _a.sent();
                        console.error("Error sending performance alert:", error_4);
                        return [3 /*break*/, 3];
                    case 3: return [2 /*return*/];
                }
            });
        });
    };
    NotificationService.prototype.filterPropsForUser = function (props, prefs) {
        var allowedSports = prefs.sports;
        var allowedPlatforms = prefs.platforms;
        return props.filter(function (prop) {
            if (!prefs.newPropsEnabled)
                return false;
            if (!allowedSports.includes(prop.sport))
                return false;
            if (!allowedPlatforms.includes(prop.platform))
                return false;
            if (prefs.highConfidenceOnly && prop.confidence < prefs.minConfidence) {
                return false;
            }
            return true;
        });
    };
    NotificationService.prototype.shouldNotifyForProp = function (prop, prefs) {
        var allowedSports = prefs.sports;
        var allowedPlatforms = prefs.platforms;
        if (!allowedSports.includes(prop.sport))
            return false;
        if (!allowedPlatforms.includes(prop.platform))
            return false;
        return true;
    };
    NotificationService.prototype.createNewPropsNotification = function (userId, props) {
        return __awaiter(this, void 0, void 0, function () {
            var sportCounts, sportSummary, highestConfidence, notification;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        sportCounts = props.reduce(function (acc, prop) {
                            acc[prop.sport] = (acc[prop.sport] || 0) + 1;
                            return acc;
                        }, {});
                        sportSummary = Object.entries(sportCounts)
                            .map(function (_a) {
                            var sport = _a[0], count = _a[1];
                            return "".concat(count, " ").concat(sport);
                        })
                            .join(", ");
                        highestConfidence = Math.max.apply(Math, props.map(function (p) { return p.confidence; }));
                        notification = {
                            userId: userId,
                            type: "new_props",
                            title: "".concat(props.length, " New Props Available"),
                            message: "Fresh props added: ".concat(sportSummary, ". Highest confidence: ").concat(highestConfidence, "%"),
                            propIds: props.map(function (p) { return p.id; }),
                            isRead: false,
                        };
                        return [4 /*yield*/, this.storage.createNotification(notification)];
                    case 1:
                        _a.sent();
                        // Also send Discord notification
                        return [4 /*yield*/, discordNotificationService.notifyNewProps(userId, props)];
                    case 2:
                        // Also send Discord notification
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        });
    };
    NotificationService.prototype.createHighConfidenceNotification = function (userId, prop) {
        return __awaiter(this, void 0, void 0, function () {
            var notification;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        notification = {
                            userId: userId,
                            type: "high_confidence_prop",
                            title: "High Confidence Prop: ".concat(prop.confidence, "%"),
                            message: "".concat(prop.player, " ").concat(prop.stat, " ").concat(prop.direction, " ").concat(prop.line, " (").concat(prop.sport, ")"),
                            propIds: [prop.id],
                            isRead: false,
                        };
                        return [4 /*yield*/, this.storage.createNotification(notification)];
                    case 1:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        });
    };
    NotificationService.prototype.getUserNotifications = function (userId_1) {
        return __awaiter(this, arguments, void 0, function (userId, limit) {
            if (limit === void 0) { limit = 50; }
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.storage.getUserNotifications(userId, limit)];
                    case 1: return [2 /*return*/, _a.sent()];
                }
            });
        });
    };
    NotificationService.prototype.markAsRead = function (notificationId) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.storage.markNotificationAsRead(notificationId)];
                    case 1:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        });
    };
    NotificationService.prototype.getOrCreatePreferences = function (userId) {
        return __awaiter(this, void 0, void 0, function () {
            var existing;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.storage.getNotificationPreferences(userId)];
                    case 1:
                        existing = _a.sent();
                        if (existing) {
                            return [2 /*return*/, existing];
                        }
                        return [4 /*yield*/, this.storage.createNotificationPreferences({
                                userId: userId,
                                emailEnabled: false,
                                newPropsEnabled: true,
                                highConfidenceOnly: false,
                                minConfidence: 65,
                                sports: ["NHL", "NBA", "NFL", "MLB"],
                                platforms: ["PrizePicks", "Underdog"],
                            })];
                    case 2: return [2 /*return*/, _a.sent()];
                }
            });
        });
    };
    NotificationService.prototype.updatePreferences = function (userId, updates) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.storage.updateNotificationPreferences(userId, updates)];
                    case 1: return [2 /*return*/, _a.sent()];
                }
            });
        });
    };
    return NotificationService;
}());
export { NotificationService };
