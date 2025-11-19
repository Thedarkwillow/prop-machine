var __makeTemplateObject = (this && this.__makeTemplateObject) || function (cooked, raw) {
    if (Object.defineProperty) { Object.defineProperty(cooked, "raw", { value: raw }); } else { cooked.raw = raw; }
    return cooked;
};
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
var __spreadArray = (this && this.__spreadArray) || function (to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
};
// In-memory storage implementation
var MemStorage = /** @class */ (function () {
    function MemStorage() {
        this.users = new Map();
        this.props = new Map();
        this.slips = new Map();
        this.bets = new Map();
        this.snapshots = new Map();
        this.dataFeeds = new Map();
        this.gameEvents = new Map();
        this.gameEventsByGameId = new Map();
        this.providerLimits = new Map();
        this.models = new Map();
        this.weatherData = new Map();
        this.weatherDataByGameId = new Map();
        this.notificationPreferences = new Map();
        this.notifications = new Map();
        this.analyticsSnapshots = new Map();
        this.propIdCounter = 1;
        this.slipIdCounter = 1;
        this.betIdCounter = 1;
        this.snapshotIdCounter = 1;
        this.dataFeedIdCounter = 1;
        this.gameEventIdCounter = 1;
        this.providerLimitIdCounter = 1;
        this.modelIdCounter = 1;
        this.weatherDataIdCounter = 1;
        this.notificationPreferencesIdCounter = 1;
        this.notificationIdCounter = 1;
        this.analyticsSnapshotIdCounter = 1;
        // Mutex for atomic bet placement per user
        this.userLocks = new Map();
    }
    MemStorage.prototype.getUser = function (userId) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                return [2 /*return*/, this.users.get(userId)];
            });
        });
    };
    MemStorage.prototype.upsertUser = function (userData) {
        return __awaiter(this, void 0, void 0, function () {
            var existingUser, newUser;
            return __generator(this, function (_a) {
                existingUser = userData.id ? this.users.get(userData.id) : undefined;
                newUser = __assign(__assign(__assign({}, existingUser), userData), { id: userData.id || crypto.randomUUID(), createdAt: (existingUser === null || existingUser === void 0 ? void 0 : existingUser.createdAt) || new Date(), updatedAt: new Date() });
                this.users.set(newUser.id, newUser);
                return [2 /*return*/, newUser];
            });
        });
    };
    MemStorage.prototype.createUser = function (user) {
        return __awaiter(this, void 0, void 0, function () {
            var newUser;
            return __generator(this, function (_a) {
                newUser = __assign(__assign({ id: crypto.randomUUID() }, user), { createdAt: new Date(), updatedAt: new Date() });
                this.users.set(newUser.id, newUser);
                return [2 /*return*/, newUser];
            });
        });
    };
    MemStorage.prototype.updateBankroll = function (userId, newBankroll) {
        return __awaiter(this, void 0, void 0, function () {
            var user;
            return __generator(this, function (_a) {
                user = this.users.get(userId);
                if (!user)
                    throw new Error("User not found");
                user.bankroll = newBankroll;
                return [2 /*return*/, user];
            });
        });
    };
    MemStorage.prototype.getActiveProps = function (sport) {
        return __awaiter(this, void 0, void 0, function () {
            var allProps;
            return __generator(this, function (_a) {
                allProps = Array.from(this.props.values()).filter(function (p) { return p.isActive; });
                if (sport) {
                    return [2 /*return*/, allProps.filter(function (p) { return p.sport === sport; })];
                }
                return [2 /*return*/, allProps];
            });
        });
    };
    MemStorage.prototype.getActivePropsWithLineMovement = function (sport) {
        return __awaiter(this, void 0, void 0, function () {
            var props;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.getActiveProps(sport)];
                    case 1:
                        props = _a.sent();
                        return [2 /*return*/, props.map(function (prop) { return (__assign(__assign({}, prop), { latestLineMovement: null })); })];
                }
            });
        });
    };
    MemStorage.prototype.getAllActiveProps = function () {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                return [2 /*return*/, Array.from(this.props.values()).filter(function (p) { return p.isActive; })];
            });
        });
    };
    MemStorage.prototype.createProp = function (prop) {
        return __awaiter(this, void 0, void 0, function () {
            var newProp;
            return __generator(this, function (_a) {
                newProp = __assign(__assign({ id: this.propIdCounter++ }, prop), { createdAt: new Date() });
                this.props.set(newProp.id, newProp);
                return [2 /*return*/, newProp];
            });
        });
    };
    MemStorage.prototype.deactivateProp = function (propId) {
        return __awaiter(this, void 0, void 0, function () {
            var prop;
            return __generator(this, function (_a) {
                prop = this.props.get(propId);
                if (prop) {
                    prop.isActive = false;
                }
                return [2 /*return*/];
            });
        });
    };
    MemStorage.prototype.getActivePropIdsBySportAndPlatform = function (sport, platform) {
        return __awaiter(this, void 0, void 0, function () {
            var ids, _i, _a, prop;
            return __generator(this, function (_b) {
                ids = [];
                for (_i = 0, _a = this.props.values(); _i < _a.length; _i++) {
                    prop = _a[_i];
                    if (prop.sport === sport && prop.platform === platform && prop.isActive) {
                        ids.push(prop.id);
                    }
                }
                return [2 /*return*/, ids];
            });
        });
    };
    MemStorage.prototype.deactivatePropsBySportAndPlatform = function (sport, platform) {
        return __awaiter(this, void 0, void 0, function () {
            var count, _i, _a, prop;
            return __generator(this, function (_b) {
                count = 0;
                for (_i = 0, _a = this.props.values(); _i < _a.length; _i++) {
                    prop = _a[_i];
                    if (prop.sport === sport && prop.platform === platform && prop.isActive) {
                        prop.isActive = false;
                        count++;
                    }
                }
                return [2 /*return*/, count];
            });
        });
    };
    MemStorage.prototype.deactivateSpecificProps = function (propIds) {
        return __awaiter(this, void 0, void 0, function () {
            var count, _i, propIds_1, id, prop;
            return __generator(this, function (_a) {
                count = 0;
                for (_i = 0, propIds_1 = propIds; _i < propIds_1.length; _i++) {
                    id = propIds_1[_i];
                    prop = this.props.get(id);
                    if (prop && prop.isActive) {
                        prop.isActive = false;
                        count++;
                    }
                }
                return [2 /*return*/, count];
            });
        });
    };
    MemStorage.prototype.getSlipsByUser = function (userId) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                return [2 /*return*/, Array.from(this.slips.values()).filter(function (s) { return s.userId === userId; })];
            });
        });
    };
    MemStorage.prototype.getPendingSlips = function (userId) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                return [2 /*return*/, Array.from(this.slips.values()).filter(function (s) { return s.userId === userId && s.status === "pending"; })];
            });
        });
    };
    MemStorage.prototype.createSlip = function (slip) {
        return __awaiter(this, void 0, void 0, function () {
            var newSlip;
            return __generator(this, function (_a) {
                newSlip = __assign(__assign({ id: this.slipIdCounter++ }, slip), { createdAt: new Date() });
                this.slips.set(newSlip.id, newSlip);
                return [2 /*return*/, newSlip];
            });
        });
    };
    MemStorage.prototype.updateSlipStatus = function (slipId, status) {
        return __awaiter(this, void 0, void 0, function () {
            var slip;
            return __generator(this, function (_a) {
                slip = this.slips.get(slipId);
                if (!slip)
                    throw new Error("Slip not found");
                slip.status = status;
                return [2 /*return*/, slip];
            });
        });
    };
    MemStorage.prototype.getBet = function (betId) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                return [2 /*return*/, this.bets.get(betId)];
            });
        });
    };
    MemStorage.prototype.getBetsByUser = function (userId) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                return [2 /*return*/, Array.from(this.bets.values()).filter(function (b) { return b.userId === userId; })];
            });
        });
    };
    MemStorage.prototype.getBetsWithProps = function (userId) {
        return __awaiter(this, void 0, void 0, function () {
            var userBets;
            var _this = this;
            return __generator(this, function (_a) {
                userBets = Array.from(this.bets.values()).filter(function (b) { return b.userId === userId; });
                return [2 /*return*/, userBets.map(function (bet) {
                        var prop = bet.propId ? _this.props.get(bet.propId) : undefined;
                        return __assign(__assign({}, bet), { prop: prop });
                    }).sort(function (a, b) { return b.createdAt.getTime() - a.createdAt.getTime(); })]; // Most recent first
            });
        });
    };
    MemStorage.prototype.createBet = function (bet) {
        return __awaiter(this, void 0, void 0, function () {
            var newBet;
            return __generator(this, function (_a) {
                newBet = __assign(__assign({ id: this.betIdCounter++ }, bet), { createdAt: new Date() });
                this.bets.set(newBet.id, newBet);
                return [2 /*return*/, newBet];
            });
        });
    };
    MemStorage.prototype.placeBetWithBankrollCheck = function (bet) {
        return __awaiter(this, void 0, void 0, function () {
            var userId, operation, previousLock, newLock, result;
            var _this = this;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        userId = bet.userId;
                        operation = function () { return __awaiter(_this, void 0, void 0, function () {
                            var user, currentBankroll, betAmount, newBet;
                            return __generator(this, function (_a) {
                                switch (_a.label) {
                                    case 0:
                                        user = this.users.get(userId);
                                        if (!user) {
                                            return [2 /*return*/, { success: false, error: "User not found" }];
                                        }
                                        currentBankroll = parseFloat(user.bankroll);
                                        betAmount = parseFloat(bet.amount);
                                        if (betAmount <= 0) {
                                            return [2 /*return*/, { success: false, error: "Bet amount must be greater than zero" }];
                                        }
                                        if (betAmount > currentBankroll) {
                                            return [2 /*return*/, {
                                                    success: false,
                                                    error: "Insufficient bankroll: bet amount $".concat(betAmount.toFixed(2), " exceeds available $").concat(currentBankroll.toFixed(2))
                                                }];
                                        }
                                        newBet = __assign(__assign({ id: this.betIdCounter++ }, bet), { createdAt: new Date() });
                                        this.bets.set(newBet.id, newBet);
                                        // Update bankroll using the existing method
                                        return [4 /*yield*/, this.updateBankroll(userId, (currentBankroll - betAmount).toFixed(2))];
                                    case 1:
                                        // Update bankroll using the existing method
                                        _a.sent();
                                        return [2 /*return*/, { success: true, bet: newBet }];
                                }
                            });
                        }); };
                        previousLock = this.userLocks.get(userId) || Promise.resolve();
                        newLock = previousLock.then(operation).catch(function (error) {
                            // Convert any thrown errors to result format
                            return { success: false, error: error.message || "Unknown error occurred" };
                        });
                        this.userLocks.set(userId, newLock);
                        return [4 /*yield*/, newLock];
                    case 1:
                        result = _a.sent();
                        // Clean up lock if this was the last operation
                        if (this.userLocks.get(userId) === newLock) {
                            this.userLocks.delete(userId);
                        }
                        return [2 /*return*/, result];
                }
            });
        });
    };
    MemStorage.prototype.settleBetWithBankrollUpdate = function (betId, outcome, closingLine, clv) {
        return __awaiter(this, void 0, void 0, function () {
            var bet, userId, operation, previousLock, newLock, result;
            var _this = this;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        bet = this.bets.get(betId);
                        if (!bet) {
                            return [2 /*return*/, { success: false, error: "Bet not found" }];
                        }
                        userId = bet.userId;
                        operation = function () { return __awaiter(_this, void 0, void 0, function () {
                            var user, currentBankroll, betAmount, potentialReturn, bankrollChange, newBankroll;
                            return __generator(this, function (_a) {
                                switch (_a.label) {
                                    case 0:
                                        user = this.users.get(userId);
                                        if (!user) {
                                            return [2 /*return*/, { success: false, error: "User not found" }];
                                        }
                                        // Check if bet is already settled
                                        if (bet.status.toLowerCase() !== 'pending') {
                                            return [2 /*return*/, { success: false, error: "Bet already settled with status: ".concat(bet.status) }];
                                        }
                                        currentBankroll = parseFloat(user.bankroll);
                                        betAmount = parseFloat(bet.amount);
                                        potentialReturn = parseFloat(bet.potentialReturn || '0');
                                        bankrollChange = 0;
                                        newBankroll = currentBankroll;
                                        // Calculate bankroll change based on outcome
                                        if (outcome === 'won') {
                                            // Add the full potential return (includes original stake)
                                            bankrollChange = potentialReturn;
                                            newBankroll = currentBankroll + potentialReturn;
                                        }
                                        else if (outcome === 'pushed') {
                                            // Refund the original bet amount
                                            bankrollChange = betAmount;
                                            newBankroll = currentBankroll + betAmount;
                                        }
                                        // For 'lost', bankroll stays the same (already deducted when placed)
                                        // Update bet status atomically with bankroll
                                        bet.status = outcome;
                                        if (closingLine)
                                            bet.closingLine = closingLine;
                                        if (clv)
                                            bet.clv = clv;
                                        bet.settledAt = new Date();
                                        // Update bankroll
                                        return [4 /*yield*/, this.updateBankroll(userId, newBankroll.toFixed(2))];
                                    case 1:
                                        // Update bankroll
                                        _a.sent();
                                        return [2 /*return*/, { success: true, bet: bet, bankrollChange: bankrollChange }];
                                }
                            });
                        }); };
                        previousLock = this.userLocks.get(userId) || Promise.resolve();
                        newLock = previousLock.then(operation).catch(function (error) {
                            return { success: false, error: error.message || "Unknown error occurred" };
                        });
                        this.userLocks.set(userId, newLock);
                        return [4 /*yield*/, newLock];
                    case 1:
                        result = _a.sent();
                        // Clean up lock if this was the last operation
                        if (this.userLocks.get(userId) === newLock) {
                            this.userLocks.delete(userId);
                        }
                        return [2 /*return*/, result];
                }
            });
        });
    };
    MemStorage.prototype.updateBetStatus = function (betId, status, closingLine, clv) {
        return __awaiter(this, void 0, void 0, function () {
            var bet;
            return __generator(this, function (_a) {
                bet = this.bets.get(betId);
                if (!bet)
                    throw new Error("Bet not found");
                bet.status = status;
                if (closingLine)
                    bet.closingLine = closingLine;
                if (clv)
                    bet.clv = clv;
                bet.settledAt = new Date();
                return [2 /*return*/, bet];
            });
        });
    };
    MemStorage.prototype.getWeek1Bets = function (userId) {
        return __awaiter(this, void 0, void 0, function () {
            var oneWeekAgo;
            return __generator(this, function (_a) {
                oneWeekAgo = new Date();
                oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
                return [2 /*return*/, Array.from(this.bets.values()).filter(function (b) { return b.userId === userId && b.createdAt >= oneWeekAgo; })];
            });
        });
    };
    MemStorage.prototype.getLatestSnapshot = function (userId) {
        return __awaiter(this, void 0, void 0, function () {
            var userSnapshots;
            return __generator(this, function (_a) {
                userSnapshots = Array.from(this.snapshots.values())
                    .filter(function (s) { return s.userId === userId; })
                    .sort(function (a, b) { return b.date.getTime() - a.date.getTime(); });
                return [2 /*return*/, userSnapshots[0]];
            });
        });
    };
    MemStorage.prototype.createSnapshot = function (snapshot) {
        return __awaiter(this, void 0, void 0, function () {
            var newSnapshot;
            return __generator(this, function (_a) {
                newSnapshot = __assign(__assign({ id: this.snapshotIdCounter++ }, snapshot), { createdAt: new Date() });
                this.snapshots.set(newSnapshot.id, newSnapshot);
                return [2 /*return*/, newSnapshot];
            });
        });
    };
    MemStorage.prototype.getSnapshotHistory = function (userId, days) {
        return __awaiter(this, void 0, void 0, function () {
            var cutoffDate;
            return __generator(this, function (_a) {
                cutoffDate = new Date();
                cutoffDate.setDate(cutoffDate.getDate() - days);
                return [2 /*return*/, Array.from(this.snapshots.values())
                        .filter(function (s) { return s.userId === userId && s.date >= cutoffDate; })
                        .sort(function (a, b) { return a.date.getTime() - b.date.getTime(); })];
            });
        });
    };
    MemStorage.prototype.createDataFeed = function (feed) {
        return __awaiter(this, void 0, void 0, function () {
            var newFeed;
            return __generator(this, function (_a) {
                newFeed = __assign(__assign({ id: this.dataFeedIdCounter++ }, feed), { createdAt: new Date() });
                this.dataFeeds.set(newFeed.id, newFeed);
                return [2 /*return*/, newFeed];
            });
        });
    };
    MemStorage.prototype.getDataFeeds = function (provider, endpoint) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                return [2 /*return*/, Array.from(this.dataFeeds.values()).filter(function (f) { return f.provider === provider && f.endpoint === endpoint; })];
            });
        });
    };
    MemStorage.prototype.createGameEvent = function (event) {
        return __awaiter(this, void 0, void 0, function () {
            var newEvent;
            return __generator(this, function (_a) {
                newEvent = __assign(__assign({ id: this.gameEventIdCounter++ }, event), { createdAt: new Date(), updatedAt: new Date() });
                this.gameEvents.set(newEvent.id, newEvent);
                this.gameEventsByGameId.set(newEvent.gameId, newEvent);
                return [2 /*return*/, newEvent];
            });
        });
    };
    MemStorage.prototype.updateGameEvent = function (gameId, event) {
        return __awaiter(this, void 0, void 0, function () {
            var existingEvent, updatedEvent;
            return __generator(this, function (_a) {
                existingEvent = this.gameEventsByGameId.get(gameId);
                if (!existingEvent)
                    throw new Error("Game event not found");
                updatedEvent = __assign(__assign(__assign({}, existingEvent), event), { updatedAt: new Date() });
                this.gameEvents.set(updatedEvent.id, updatedEvent);
                this.gameEventsByGameId.set(updatedEvent.gameId, updatedEvent);
                return [2 /*return*/, updatedEvent];
            });
        });
    };
    MemStorage.prototype.getGameEvent = function (gameId) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                return [2 /*return*/, this.gameEventsByGameId.get(gameId)];
            });
        });
    };
    MemStorage.prototype.getPendingGames = function (sport) {
        return __awaiter(this, void 0, void 0, function () {
            var allEvents;
            return __generator(this, function (_a) {
                allEvents = Array.from(this.gameEvents.values()).filter(function (e) { return e.status === "scheduled" || e.status === "in_progress"; });
                if (sport) {
                    return [2 /*return*/, allEvents.filter(function (e) { return e.sport === sport; })];
                }
                return [2 /*return*/, allEvents];
            });
        });
    };
    MemStorage.prototype.createProviderLimit = function (limit) {
        return __awaiter(this, void 0, void 0, function () {
            var newLimit;
            return __generator(this, function (_a) {
                newLimit = __assign(__assign({ id: this.providerLimitIdCounter++ }, limit), { lastReset: new Date(), updatedAt: new Date() });
                this.providerLimits.set(newLimit.provider, newLimit);
                return [2 /*return*/, newLimit];
            });
        });
    };
    MemStorage.prototype.updateProviderLimit = function (provider, updates) {
        return __awaiter(this, void 0, void 0, function () {
            var existingLimit, updatedLimit;
            return __generator(this, function (_a) {
                existingLimit = this.providerLimits.get(provider);
                if (!existingLimit)
                    throw new Error("Provider limit not found");
                updatedLimit = __assign(__assign(__assign({}, existingLimit), updates), { updatedAt: new Date() });
                this.providerLimits.set(provider, updatedLimit);
                return [2 /*return*/, updatedLimit];
            });
        });
    };
    MemStorage.prototype.getProviderLimit = function (provider) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                return [2 /*return*/, this.providerLimits.get(provider)];
            });
        });
    };
    MemStorage.prototype.createModel = function (model) {
        return __awaiter(this, void 0, void 0, function () {
            var newModel;
            return __generator(this, function (_a) {
                newModel = __assign(__assign({ id: this.modelIdCounter++ }, model), { createdAt: new Date() });
                this.models.set(newModel.id, newModel);
                return [2 /*return*/, newModel];
            });
        });
    };
    MemStorage.prototype.getActiveModel = function (sport) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                return [2 /*return*/, Array.from(this.models.values()).find(function (m) { return m.sport === sport && m.isActive; })];
            });
        });
    };
    MemStorage.prototype.getAllModels = function () {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                return [2 /*return*/, Array.from(this.models.values())];
            });
        });
    };
    // Weather data
    MemStorage.prototype.createWeatherData = function (weather) {
        return __awaiter(this, void 0, void 0, function () {
            var newWeatherData;
            return __generator(this, function (_a) {
                newWeatherData = __assign(__assign({ id: this.weatherDataIdCounter++ }, weather), { createdAt: new Date() });
                this.weatherData.set(newWeatherData.id, newWeatherData);
                this.weatherDataByGameId.set(newWeatherData.gameId, newWeatherData);
                return [2 /*return*/, newWeatherData];
            });
        });
    };
    MemStorage.prototype.getWeatherDataByGameId = function (gameId) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                return [2 /*return*/, this.weatherDataByGameId.get(gameId)];
            });
        });
    };
    // Notifications
    MemStorage.prototype.createNotificationPreferences = function (prefs) {
        return __awaiter(this, void 0, void 0, function () {
            var newPrefs;
            return __generator(this, function (_a) {
                newPrefs = __assign(__assign({ id: this.notificationPreferencesIdCounter++ }, prefs), { createdAt: new Date(), updatedAt: new Date() });
                this.notificationPreferences.set(newPrefs.userId, newPrefs);
                return [2 /*return*/, newPrefs];
            });
        });
    };
    MemStorage.prototype.getNotificationPreferences = function (userId) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                return [2 /*return*/, this.notificationPreferences.get(userId)];
            });
        });
    };
    MemStorage.prototype.getAllNotificationPreferences = function () {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                return [2 /*return*/, Array.from(this.notificationPreferences.values())];
            });
        });
    };
    MemStorage.prototype.updateNotificationPreferences = function (userId, prefs) {
        return __awaiter(this, void 0, void 0, function () {
            var existingPrefs, updatedPrefs;
            return __generator(this, function (_a) {
                existingPrefs = this.notificationPreferences.get(userId);
                if (!existingPrefs)
                    throw new Error("Notification preferences not found");
                updatedPrefs = __assign(__assign(__assign({}, existingPrefs), prefs), { updatedAt: new Date() });
                this.notificationPreferences.set(userId, updatedPrefs);
                return [2 /*return*/, updatedPrefs];
            });
        });
    };
    MemStorage.prototype.createNotification = function (notification) {
        return __awaiter(this, void 0, void 0, function () {
            var newNotification;
            return __generator(this, function (_a) {
                newNotification = __assign(__assign({ id: this.notificationIdCounter++ }, notification), { createdAt: new Date() });
                this.notifications.set(newNotification.id, newNotification);
                return [2 /*return*/, newNotification];
            });
        });
    };
    MemStorage.prototype.getUserNotifications = function (userId, limit) {
        return __awaiter(this, void 0, void 0, function () {
            var userNotifications;
            return __generator(this, function (_a) {
                userNotifications = Array.from(this.notifications.values())
                    .filter(function (n) { return n.userId === userId; })
                    .sort(function (a, b) { return b.createdAt.getTime() - a.createdAt.getTime(); });
                if (limit) {
                    return [2 /*return*/, userNotifications.slice(0, limit)];
                }
                return [2 /*return*/, userNotifications];
            });
        });
    };
    MemStorage.prototype.markNotificationAsRead = function (notificationId) {
        return __awaiter(this, void 0, void 0, function () {
            var notification;
            return __generator(this, function (_a) {
                notification = this.notifications.get(notificationId);
                if (notification) {
                    notification.isRead = true;
                }
                return [2 /*return*/];
            });
        });
    };
    // Analytics
    MemStorage.prototype.createAnalyticsSnapshot = function (snapshot) {
        return __awaiter(this, void 0, void 0, function () {
            var newSnapshot;
            return __generator(this, function (_a) {
                newSnapshot = __assign(__assign({ id: this.analyticsSnapshotIdCounter++ }, snapshot), { createdAt: new Date() });
                this.analyticsSnapshots.set(newSnapshot.id, newSnapshot);
                return [2 /*return*/, newSnapshot];
            });
        });
    };
    MemStorage.prototype.getLatestAnalytics = function (userId) {
        return __awaiter(this, void 0, void 0, function () {
            var userSnapshots;
            return __generator(this, function (_a) {
                userSnapshots = Array.from(this.analyticsSnapshots.values())
                    .filter(function (s) { return s.userId === userId; })
                    .sort(function (a, b) { return b.date.getTime() - a.date.getTime(); });
                return [2 /*return*/, userSnapshots[0]];
            });
        });
    };
    MemStorage.prototype.getAnalyticsHistory = function (userId, days) {
        return __awaiter(this, void 0, void 0, function () {
            var cutoffDate;
            return __generator(this, function (_a) {
                cutoffDate = new Date();
                cutoffDate.setDate(cutoffDate.getDate() - days);
                return [2 /*return*/, Array.from(this.analyticsSnapshots.values())
                        .filter(function (s) { return s.userId === userId && s.date >= cutoffDate; })
                        .sort(function (a, b) { return a.date.getTime() - b.date.getTime(); })];
            });
        });
    };
    // Line movements (in-memory not used, stubs for interface)
    MemStorage.prototype.createLineMovement = function (movement) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                throw new Error("Line movements not implemented in MemStorage");
            });
        });
    };
    MemStorage.prototype.getLineMovements = function (propId) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                return [2 /*return*/, []];
            });
        });
    };
    MemStorage.prototype.getRecentLineMovements = function (minutes) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                return [2 /*return*/, []];
            });
        });
    };
    // Discord settings (in-memory not used, stubs for interface)
    MemStorage.prototype.createDiscordSettings = function (settings) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                throw new Error("Discord settings not implemented in MemStorage");
            });
        });
    };
    MemStorage.prototype.getDiscordSettings = function (userId) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                return [2 /*return*/, undefined];
            });
        });
    };
    MemStorage.prototype.updateDiscordSettings = function (userId, settings) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                throw new Error("Discord settings not implemented in MemStorage");
            });
        });
    };
    MemStorage.prototype.deleteDiscordSettings = function (userId) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                return [2 /*return*/];
            });
        });
    };
    return MemStorage;
}());
// Database storage implementation using Drizzle ORM
import { db } from "./db";
import { users, props, slips, bets, performanceSnapshots, dataFeeds, gameEvents, providerLimits, models, weatherData, notificationPreferences, notifications, analyticsSnapshots, lineMovements, discordSettings } from "@shared/schema";
import { eq, and, desc, gte, sql, inArray, or } from "drizzle-orm";
var DbStorage = /** @class */ (function () {
    function DbStorage() {
    }
    // User management
    DbStorage.prototype.getUser = function (userId) {
        return __awaiter(this, void 0, void 0, function () {
            var result;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, db.select().from(users).where(eq(users.id, userId)).limit(1)];
                    case 1:
                        result = _a.sent();
                        return [2 /*return*/, result[0]];
                }
            });
        });
    };
    DbStorage.prototype.upsertUser = function (userData) {
        return __awaiter(this, void 0, void 0, function () {
            var existing, user_1, user;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, db
                            .select()
                            .from(users)
                            .where(or(eq(users.id, userData.id), userData.email ? eq(users.email, userData.email) : sql(templateObject_1 || (templateObject_1 = __makeTemplateObject(["false"], ["false"])))))
                            .limit(1)];
                    case 1:
                        existing = _a.sent();
                        if (!(existing.length > 0)) return [3 /*break*/, 3];
                        return [4 /*yield*/, db
                                .update(users)
                                .set(__assign(__assign({}, userData), { updatedAt: new Date() }))
                                .where(eq(users.id, existing[0].id))
                                .returning()];
                    case 2:
                        user_1 = (_a.sent())[0];
                        return [2 /*return*/, user_1];
                    case 3: return [4 /*yield*/, db
                            .insert(users)
                            .values(userData)
                            .returning()];
                    case 4:
                        user = (_a.sent())[0];
                        return [2 /*return*/, user];
                }
            });
        });
    };
    DbStorage.prototype.createUser = function (user) {
        return __awaiter(this, void 0, void 0, function () {
            var result;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, db.insert(users).values(user).returning()];
                    case 1:
                        result = _a.sent();
                        return [2 /*return*/, result[0]];
                }
            });
        });
    };
    DbStorage.prototype.updateBankroll = function (userId, newBankroll) {
        return __awaiter(this, void 0, void 0, function () {
            var result;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, db
                            .update(users)
                            .set({ bankroll: newBankroll })
                            .where(eq(users.id, userId))
                            .returning()];
                    case 1:
                        result = _a.sent();
                        if (!result[0])
                            throw new Error("User not found");
                        return [2 /*return*/, result[0]];
                }
            });
        });
    };
    // Props
    DbStorage.prototype.getActiveProps = function (sport) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (!sport) return [3 /*break*/, 2];
                        return [4 /*yield*/, db
                                .select()
                                .from(props)
                                .where(and(eq(props.isActive, true), eq(props.sport, sport)))];
                    case 1: return [2 /*return*/, _a.sent()];
                    case 2: return [4 /*yield*/, db.select().from(props).where(eq(props.isActive, true))];
                    case 3: return [2 /*return*/, _a.sent()];
                }
            });
        });
    };
    DbStorage.prototype.getActivePropsWithLineMovement = function (sport) {
        return __awaiter(this, void 0, void 0, function () {
            var activeProps, propIds, latestMovementsQuery, allMovements, latestMovementsMap, _i, allMovements_1, movement;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.getActiveProps(sport)];
                    case 1:
                        activeProps = _a.sent();
                        if (activeProps.length === 0) {
                            return [2 /*return*/, []];
                        }
                        propIds = activeProps.map(function (p) { return p.id; });
                        latestMovementsQuery = db
                            .select({
                            propId: lineMovements.propId,
                            oldLine: lineMovements.oldLine,
                            newLine: lineMovements.newLine,
                            movement: lineMovements.movement,
                            timestamp: lineMovements.timestamp,
                        })
                            .from(lineMovements)
                            .where(inArray(lineMovements.propId, propIds))
                            .orderBy(desc(lineMovements.timestamp));
                        return [4 /*yield*/, latestMovementsQuery];
                    case 2:
                        allMovements = _a.sent();
                        latestMovementsMap = new Map();
                        for (_i = 0, allMovements_1 = allMovements; _i < allMovements_1.length; _i++) {
                            movement = allMovements_1[_i];
                            if (!latestMovementsMap.has(movement.propId)) {
                                latestMovementsMap.set(movement.propId, {
                                    oldLine: movement.oldLine,
                                    newLine: movement.newLine,
                                    movement: movement.movement,
                                    timestamp: movement.timestamp,
                                });
                            }
                        }
                        // Combine props with their latest line movement
                        return [2 /*return*/, activeProps.map(function (prop) { return (__assign(__assign({}, prop), { latestLineMovement: latestMovementsMap.get(prop.id) || null })); })];
                }
            });
        });
    };
    DbStorage.prototype.getAllActiveProps = function () {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, db.select().from(props).where(eq(props.isActive, true))];
                    case 1: return [2 /*return*/, _a.sent()];
                }
            });
        });
    };
    DbStorage.prototype.createProp = function (prop) {
        return __awaiter(this, void 0, void 0, function () {
            var result;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, db.insert(props).values(prop).returning()];
                    case 1:
                        result = _a.sent();
                        return [2 /*return*/, result[0]];
                }
            });
        });
    };
    DbStorage.prototype.deactivateProp = function (propId) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, db.update(props).set({ isActive: false }).where(eq(props.id, propId))];
                    case 1:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        });
    };
    DbStorage.prototype.getActivePropIdsBySportAndPlatform = function (sport, platform) {
        return __awaiter(this, void 0, void 0, function () {
            var result;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, db
                            .select({ id: props.id })
                            .from(props)
                            .where(and(eq(props.sport, sport), eq(props.platform, platform), eq(props.isActive, true)))];
                    case 1:
                        result = _a.sent();
                        return [2 /*return*/, result.map(function (r) { return r.id; })];
                }
            });
        });
    };
    DbStorage.prototype.deactivatePropsBySportAndPlatform = function (sport, platform) {
        return __awaiter(this, void 0, void 0, function () {
            var result;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, db
                            .update(props)
                            .set({ isActive: false })
                            .where(and(eq(props.sport, sport), eq(props.platform, platform), eq(props.isActive, true)))
                            .returning({ id: props.id })];
                    case 1:
                        result = _a.sent();
                        return [2 /*return*/, result.length];
                }
            });
        });
    };
    DbStorage.prototype.deactivateSpecificProps = function (propIds) {
        return __awaiter(this, void 0, void 0, function () {
            var result;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (propIds.length === 0)
                            return [2 /*return*/, 0];
                        return [4 /*yield*/, db
                                .update(props)
                                .set({ isActive: false })
                                .where(and(inArray(props.id, propIds), eq(props.isActive, true)))
                                .returning({ id: props.id })];
                    case 1:
                        result = _a.sent();
                        return [2 /*return*/, result.length];
                }
            });
        });
    };
    // Slips
    DbStorage.prototype.getSlipsByUser = function (userId) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, db.select().from(slips).where(eq(slips.userId, userId))];
                    case 1: return [2 /*return*/, _a.sent()];
                }
            });
        });
    };
    DbStorage.prototype.getPendingSlips = function (userId) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, db
                            .select()
                            .from(slips)
                            .where(and(eq(slips.userId, userId), eq(slips.status, "pending")))];
                    case 1: return [2 /*return*/, _a.sent()];
                }
            });
        });
    };
    DbStorage.prototype.createSlip = function (slip) {
        return __awaiter(this, void 0, void 0, function () {
            var result;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, db.insert(slips).values(slip).returning()];
                    case 1:
                        result = _a.sent();
                        return [2 /*return*/, result[0]];
                }
            });
        });
    };
    DbStorage.prototype.updateSlipStatus = function (slipId, status) {
        return __awaiter(this, void 0, void 0, function () {
            var result;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, db
                            .update(slips)
                            .set({ status: status })
                            .where(eq(slips.id, slipId))
                            .returning()];
                    case 1:
                        result = _a.sent();
                        if (!result[0])
                            throw new Error("Slip not found");
                        return [2 /*return*/, result[0]];
                }
            });
        });
    };
    // Bets
    DbStorage.prototype.getBet = function (betId) {
        return __awaiter(this, void 0, void 0, function () {
            var result;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, db.select().from(bets).where(eq(bets.id, betId)).limit(1)];
                    case 1:
                        result = _a.sent();
                        return [2 /*return*/, result[0]];
                }
            });
        });
    };
    DbStorage.prototype.getBetsByUser = function (userId) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, db.select().from(bets).where(eq(bets.userId, userId))];
                    case 1: return [2 /*return*/, _a.sent()];
                }
            });
        });
    };
    DbStorage.prototype.getBetsWithProps = function (userId) {
        return __awaiter(this, void 0, void 0, function () {
            var userBets, propIds, propsMap_1, propsData, slipIds, slipsMap_1, slipsData, error_1;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 6, , 7]);
                        return [4 /*yield*/, db
                                .select()
                                .from(bets)
                                .where(eq(bets.userId, userId))
                                .orderBy(desc(bets.createdAt))];
                    case 1:
                        userBets = _a.sent();
                        propIds = __spreadArray([], new Set(userBets.map(function (b) { return b.propId; }).filter(function (id) { return id !== null; })), true);
                        propsMap_1 = new Map();
                        if (!(propIds.length > 0)) return [3 /*break*/, 3];
                        return [4 /*yield*/, db
                                .select()
                                .from(props)
                                .where(inArray(props.id, propIds))];
                    case 2:
                        propsData = _a.sent();
                        propsData.forEach(function (p) { return propsMap_1.set(p.id, p); });
                        _a.label = 3;
                    case 3:
                        slipIds = __spreadArray([], new Set(userBets.map(function (b) { return b.slipId; }).filter(function (id) { return id !== null; })), true);
                        slipsMap_1 = new Map();
                        if (!(slipIds.length > 0)) return [3 /*break*/, 5];
                        return [4 /*yield*/, db
                                .select()
                                .from(slips)
                                .where(inArray(slips.id, slipIds))];
                    case 4:
                        slipsData = _a.sent();
                        slipsData.forEach(function (s) { return slipsMap_1.set(s.id, s); });
                        _a.label = 5;
                    case 5: return [2 /*return*/, userBets.map(function (bet) { return (__assign(__assign({}, bet), { prop: bet.propId ? propsMap_1.get(bet.propId) : undefined, slip: bet.slipId ? slipsMap_1.get(bet.slipId) : undefined })); })];
                    case 6:
                        error_1 = _a.sent();
                        console.error("Error fetching bets with props:", error_1);
                        throw error_1;
                    case 7: return [2 /*return*/];
                }
            });
        });
    };
    DbStorage.prototype.createBet = function (bet) {
        return __awaiter(this, void 0, void 0, function () {
            var result;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, db.insert(bets).values(bet).returning()];
                    case 1:
                        result = _a.sent();
                        return [2 /*return*/, result[0]];
                }
            });
        });
    };
    DbStorage.prototype.placeBetWithBankrollCheck = function (bet) {
        return __awaiter(this, void 0, void 0, function () {
            var result, error_2;
            var _this = this;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 2, , 3]);
                        return [4 /*yield*/, db.transaction(function (tx) { return __awaiter(_this, void 0, void 0, function () {
                                var userResult, user, currentBankroll, betAmount, newBet;
                                return __generator(this, function (_a) {
                                    switch (_a.label) {
                                        case 0: return [4 /*yield*/, tx
                                                .select()
                                                .from(users)
                                                .where(eq(users.id, bet.userId))
                                                .for('update')
                                                .limit(1)];
                                        case 1:
                                            userResult = _a.sent();
                                            if (!userResult[0]) {
                                                return [2 /*return*/, { success: false, error: "User not found" }];
                                            }
                                            user = userResult[0];
                                            currentBankroll = parseFloat(user.bankroll);
                                            betAmount = parseFloat(bet.amount);
                                            if (betAmount <= 0) {
                                                return [2 /*return*/, { success: false, error: "Bet amount must be greater than zero" }];
                                            }
                                            if (betAmount > currentBankroll) {
                                                return [2 /*return*/, {
                                                        success: false,
                                                        error: "Insufficient bankroll: bet amount $".concat(betAmount.toFixed(2), " exceeds available $").concat(currentBankroll.toFixed(2))
                                                    }];
                                            }
                                            return [4 /*yield*/, tx.insert(bets).values(bet).returning()];
                                        case 2:
                                            newBet = _a.sent();
                                            // Update bankroll
                                            return [4 /*yield*/, tx
                                                    .update(users)
                                                    .set({ bankroll: (currentBankroll - betAmount).toFixed(2) })
                                                    .where(eq(users.id, bet.userId))];
                                        case 3:
                                            // Update bankroll
                                            _a.sent();
                                            return [2 /*return*/, { success: true, bet: newBet[0] }];
                                    }
                                });
                            }); })];
                    case 1:
                        result = _a.sent();
                        return [2 /*return*/, result];
                    case 2:
                        error_2 = _a.sent();
                        return [2 /*return*/, { success: false, error: error_2.message || "Unknown error occurred" }];
                    case 3: return [2 /*return*/];
                }
            });
        });
    };
    DbStorage.prototype.updateBetStatus = function (betId, status, closingLine, clv) {
        return __awaiter(this, void 0, void 0, function () {
            var updateData, result;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        updateData = {
                            status: status,
                            settledAt: new Date(),
                        };
                        if (closingLine)
                            updateData.closingLine = closingLine;
                        if (clv)
                            updateData.clv = clv;
                        return [4 /*yield*/, db
                                .update(bets)
                                .set(updateData)
                                .where(eq(bets.id, betId))
                                .returning()];
                    case 1:
                        result = _a.sent();
                        if (!result[0])
                            throw new Error("Bet not found");
                        return [2 /*return*/, result[0]];
                }
            });
        });
    };
    DbStorage.prototype.settleBetWithBankrollUpdate = function (betId, outcome, closingLine, clv) {
        return __awaiter(this, void 0, void 0, function () {
            var result, error_3;
            var _this = this;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 2, , 3]);
                        return [4 /*yield*/, db.transaction(function (tx) { return __awaiter(_this, void 0, void 0, function () {
                                var betResult, bet, userResult, user, currentBankroll, betAmount, potentialReturn, bankrollChange, newBankroll, updateData, updatedBet;
                                return __generator(this, function (_a) {
                                    switch (_a.label) {
                                        case 0: return [4 /*yield*/, tx
                                                .select()
                                                .from(bets)
                                                .where(eq(bets.id, betId))
                                                .limit(1)];
                                        case 1:
                                            betResult = _a.sent();
                                            bet = betResult[0];
                                            if (!bet) {
                                                throw new Error("Bet not found");
                                            }
                                            // Check if already settled
                                            if (bet.status.toLowerCase() !== 'pending') {
                                                throw new Error("Bet already settled with status: ".concat(bet.status));
                                            }
                                            return [4 /*yield*/, tx
                                                    .select()
                                                    .from(users)
                                                    .where(eq(users.id, bet.userId))
                                                    .limit(1)];
                                        case 2:
                                            userResult = _a.sent();
                                            user = userResult[0];
                                            if (!user) {
                                                throw new Error("User not found");
                                            }
                                            currentBankroll = parseFloat(user.bankroll);
                                            betAmount = parseFloat(bet.amount);
                                            potentialReturn = parseFloat(bet.potentialReturn || '0');
                                            bankrollChange = 0;
                                            newBankroll = currentBankroll;
                                            // Calculate bankroll change based on outcome
                                            if (outcome === 'won') {
                                                bankrollChange = potentialReturn;
                                                newBankroll = currentBankroll + potentialReturn;
                                            }
                                            else if (outcome === 'pushed') {
                                                bankrollChange = betAmount;
                                                newBankroll = currentBankroll + betAmount;
                                            }
                                            updateData = {
                                                status: outcome,
                                                settledAt: new Date(),
                                            };
                                            if (closingLine)
                                                updateData.closingLine = closingLine;
                                            if (clv)
                                                updateData.clv = clv;
                                            return [4 /*yield*/, tx
                                                    .update(bets)
                                                    .set(updateData)
                                                    .where(eq(bets.id, betId))
                                                    .returning()];
                                        case 3:
                                            updatedBet = _a.sent();
                                            // Update bankroll
                                            return [4 /*yield*/, tx
                                                    .update(users)
                                                    .set({ bankroll: newBankroll.toFixed(2) })
                                                    .where(eq(users.id, bet.userId))];
                                        case 4:
                                            // Update bankroll
                                            _a.sent();
                                            return [2 /*return*/, { bet: updatedBet[0], bankrollChange: bankrollChange }];
                                    }
                                });
                            }); })];
                    case 1:
                        result = _a.sent();
                        return [2 /*return*/, __assign({ success: true }, result)];
                    case 2:
                        error_3 = _a.sent();
                        return [2 /*return*/, { success: false, error: error_3.message || "Unknown error occurred" }];
                    case 3: return [2 /*return*/];
                }
            });
        });
    };
    DbStorage.prototype.getWeek1Bets = function (userId) {
        return __awaiter(this, void 0, void 0, function () {
            var oneWeekAgo;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        oneWeekAgo = new Date();
                        oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
                        return [4 /*yield*/, db
                                .select()
                                .from(bets)
                                .where(and(eq(bets.userId, userId), gte(bets.createdAt, oneWeekAgo)))];
                    case 1: return [2 /*return*/, _a.sent()];
                }
            });
        });
    };
    // Performance
    DbStorage.prototype.getLatestSnapshot = function (userId) {
        return __awaiter(this, void 0, void 0, function () {
            var result;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, db
                            .select()
                            .from(performanceSnapshots)
                            .where(eq(performanceSnapshots.userId, userId))
                            .orderBy(desc(performanceSnapshots.date))
                            .limit(1)];
                    case 1:
                        result = _a.sent();
                        return [2 /*return*/, result[0]];
                }
            });
        });
    };
    DbStorage.prototype.createSnapshot = function (snapshot) {
        return __awaiter(this, void 0, void 0, function () {
            var result;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, db.insert(performanceSnapshots).values(snapshot).returning()];
                    case 1:
                        result = _a.sent();
                        return [2 /*return*/, result[0]];
                }
            });
        });
    };
    DbStorage.prototype.getSnapshotHistory = function (userId, days) {
        return __awaiter(this, void 0, void 0, function () {
            var cutoffDate;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        cutoffDate = new Date();
                        cutoffDate.setDate(cutoffDate.getDate() - days);
                        return [4 /*yield*/, db
                                .select()
                                .from(performanceSnapshots)
                                .where(and(eq(performanceSnapshots.userId, userId), gte(performanceSnapshots.date, cutoffDate)))
                                .orderBy(performanceSnapshots.date)];
                    case 1: return [2 /*return*/, _a.sent()];
                }
            });
        });
    };
    // Data feeds
    DbStorage.prototype.createDataFeed = function (feed) {
        return __awaiter(this, void 0, void 0, function () {
            var result;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, db.insert(dataFeeds).values(feed).returning()];
                    case 1:
                        result = _a.sent();
                        return [2 /*return*/, result[0]];
                }
            });
        });
    };
    DbStorage.prototype.getDataFeeds = function (provider, endpoint) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, db
                            .select()
                            .from(dataFeeds)
                            .where(and(eq(dataFeeds.provider, provider), eq(dataFeeds.endpoint, endpoint)))];
                    case 1: return [2 /*return*/, _a.sent()];
                }
            });
        });
    };
    // Game events
    DbStorage.prototype.createGameEvent = function (event) {
        return __awaiter(this, void 0, void 0, function () {
            var result;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, db.insert(gameEvents).values(event).returning()];
                    case 1:
                        result = _a.sent();
                        return [2 /*return*/, result[0]];
                }
            });
        });
    };
    DbStorage.prototype.updateGameEvent = function (gameId, event) {
        return __awaiter(this, void 0, void 0, function () {
            var result;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, db
                            .update(gameEvents)
                            .set(__assign(__assign({}, event), { updatedAt: new Date() }))
                            .where(eq(gameEvents.gameId, gameId))
                            .returning()];
                    case 1:
                        result = _a.sent();
                        if (!result[0])
                            throw new Error("Game event not found");
                        return [2 /*return*/, result[0]];
                }
            });
        });
    };
    DbStorage.prototype.getGameEvent = function (gameId) {
        return __awaiter(this, void 0, void 0, function () {
            var result;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, db
                            .select()
                            .from(gameEvents)
                            .where(eq(gameEvents.gameId, gameId))
                            .limit(1)];
                    case 1:
                        result = _a.sent();
                        return [2 /*return*/, result[0]];
                }
            });
        });
    };
    DbStorage.prototype.getPendingGames = function (sport) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (!sport) return [3 /*break*/, 2];
                        return [4 /*yield*/, db
                                .select()
                                .from(gameEvents)
                                .where(and(eq(gameEvents.sport, sport), or(eq(gameEvents.status, "scheduled"), eq(gameEvents.status, "in_progress"))))];
                    case 1: return [2 /*return*/, _a.sent()];
                    case 2: return [4 /*yield*/, db
                            .select()
                            .from(gameEvents)
                            .where(or(eq(gameEvents.status, "scheduled"), eq(gameEvents.status, "in_progress")))];
                    case 3: return [2 /*return*/, _a.sent()];
                }
            });
        });
    };
    // Provider limits
    DbStorage.prototype.createProviderLimit = function (limit) {
        return __awaiter(this, void 0, void 0, function () {
            var result;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, db.insert(providerLimits).values(limit).returning()];
                    case 1:
                        result = _a.sent();
                        return [2 /*return*/, result[0]];
                }
            });
        });
    };
    DbStorage.prototype.updateProviderLimit = function (provider, updates) {
        return __awaiter(this, void 0, void 0, function () {
            var result;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, db
                            .update(providerLimits)
                            .set(__assign(__assign({}, updates), { updatedAt: new Date() }))
                            .where(eq(providerLimits.provider, provider))
                            .returning()];
                    case 1:
                        result = _a.sent();
                        if (!result[0])
                            throw new Error("Provider limit not found");
                        return [2 /*return*/, result[0]];
                }
            });
        });
    };
    DbStorage.prototype.getProviderLimit = function (provider) {
        return __awaiter(this, void 0, void 0, function () {
            var result;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, db
                            .select()
                            .from(providerLimits)
                            .where(eq(providerLimits.provider, provider))
                            .limit(1)];
                    case 1:
                        result = _a.sent();
                        return [2 /*return*/, result[0]];
                }
            });
        });
    };
    // Models
    DbStorage.prototype.createModel = function (model) {
        return __awaiter(this, void 0, void 0, function () {
            var result;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, db.insert(models).values(model).returning()];
                    case 1:
                        result = _a.sent();
                        return [2 /*return*/, result[0]];
                }
            });
        });
    };
    DbStorage.prototype.getActiveModel = function (sport) {
        return __awaiter(this, void 0, void 0, function () {
            var result;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, db
                            .select()
                            .from(models)
                            .where(and(eq(models.sport, sport), eq(models.isActive, true)))
                            .limit(1)];
                    case 1:
                        result = _a.sent();
                        return [2 /*return*/, result[0]];
                }
            });
        });
    };
    DbStorage.prototype.getAllModels = function () {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, db.select().from(models)];
                    case 1: return [2 /*return*/, _a.sent()];
                }
            });
        });
    };
    // Weather data
    DbStorage.prototype.createWeatherData = function (weather) {
        return __awaiter(this, void 0, void 0, function () {
            var result;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, db.insert(weatherData).values(weather).returning()];
                    case 1:
                        result = _a.sent();
                        return [2 /*return*/, result[0]];
                }
            });
        });
    };
    DbStorage.prototype.getWeatherDataByGameId = function (gameId) {
        return __awaiter(this, void 0, void 0, function () {
            var result;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, db
                            .select()
                            .from(weatherData)
                            .where(eq(weatherData.gameId, gameId))
                            .limit(1)];
                    case 1:
                        result = _a.sent();
                        return [2 /*return*/, result[0]];
                }
            });
        });
    };
    // Notifications
    DbStorage.prototype.createNotificationPreferences = function (prefs) {
        return __awaiter(this, void 0, void 0, function () {
            var result;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, db.insert(notificationPreferences).values(prefs).returning()];
                    case 1:
                        result = _a.sent();
                        return [2 /*return*/, result[0]];
                }
            });
        });
    };
    DbStorage.prototype.getNotificationPreferences = function (userId) {
        return __awaiter(this, void 0, void 0, function () {
            var result;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, db
                            .select()
                            .from(notificationPreferences)
                            .where(eq(notificationPreferences.userId, userId))
                            .limit(1)];
                    case 1:
                        result = _a.sent();
                        return [2 /*return*/, result[0]];
                }
            });
        });
    };
    DbStorage.prototype.getAllNotificationPreferences = function () {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, db.select().from(notificationPreferences)];
                    case 1: return [2 /*return*/, _a.sent()];
                }
            });
        });
    };
    DbStorage.prototype.updateNotificationPreferences = function (userId, prefs) {
        return __awaiter(this, void 0, void 0, function () {
            var result;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, db
                            .update(notificationPreferences)
                            .set(__assign(__assign({}, prefs), { updatedAt: new Date() }))
                            .where(eq(notificationPreferences.userId, userId))
                            .returning()];
                    case 1:
                        result = _a.sent();
                        if (!result[0])
                            throw new Error("Notification preferences not found");
                        return [2 /*return*/, result[0]];
                }
            });
        });
    };
    DbStorage.prototype.createNotification = function (notification) {
        return __awaiter(this, void 0, void 0, function () {
            var result;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, db.insert(notifications).values(notification).returning()];
                    case 1:
                        result = _a.sent();
                        return [2 /*return*/, result[0]];
                }
            });
        });
    };
    DbStorage.prototype.getUserNotifications = function (userId, limit) {
        return __awaiter(this, void 0, void 0, function () {
            var query;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        query = db
                            .select()
                            .from(notifications)
                            .where(eq(notifications.userId, userId))
                            .orderBy(desc(notifications.createdAt));
                        if (!limit) return [3 /*break*/, 2];
                        return [4 /*yield*/, query.limit(limit)];
                    case 1: return [2 /*return*/, _a.sent()];
                    case 2: return [4 /*yield*/, query];
                    case 3: return [2 /*return*/, _a.sent()];
                }
            });
        });
    };
    DbStorage.prototype.markNotificationAsRead = function (notificationId) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, db
                            .update(notifications)
                            .set({ isRead: true })
                            .where(eq(notifications.id, notificationId))];
                    case 1:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        });
    };
    // Analytics
    DbStorage.prototype.createAnalyticsSnapshot = function (snapshot) {
        return __awaiter(this, void 0, void 0, function () {
            var result;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, db.insert(analyticsSnapshots).values(snapshot).returning()];
                    case 1:
                        result = _a.sent();
                        return [2 /*return*/, result[0]];
                }
            });
        });
    };
    DbStorage.prototype.getLatestAnalytics = function (userId) {
        return __awaiter(this, void 0, void 0, function () {
            var result;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, db
                            .select()
                            .from(analyticsSnapshots)
                            .where(eq(analyticsSnapshots.userId, userId))
                            .orderBy(desc(analyticsSnapshots.date))
                            .limit(1)];
                    case 1:
                        result = _a.sent();
                        return [2 /*return*/, result[0]];
                }
            });
        });
    };
    DbStorage.prototype.getAnalyticsHistory = function (userId, days) {
        return __awaiter(this, void 0, void 0, function () {
            var cutoffDate;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        cutoffDate = new Date();
                        cutoffDate.setDate(cutoffDate.getDate() - days);
                        return [4 /*yield*/, db
                                .select()
                                .from(analyticsSnapshots)
                                .where(and(eq(analyticsSnapshots.userId, userId), gte(analyticsSnapshots.date, cutoffDate)))
                                .orderBy(analyticsSnapshots.date)];
                    case 1: return [2 /*return*/, _a.sent()];
                }
            });
        });
    };
    // Line movements
    DbStorage.prototype.createLineMovement = function (movement) {
        return __awaiter(this, void 0, void 0, function () {
            var result;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, db.insert(lineMovements).values(movement).returning()];
                    case 1:
                        result = _a.sent();
                        return [2 /*return*/, result[0]];
                }
            });
        });
    };
    DbStorage.prototype.getLineMovements = function (propId) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, db
                            .select()
                            .from(lineMovements)
                            .where(eq(lineMovements.propId, propId))
                            .orderBy(lineMovements.timestamp)];
                    case 1: return [2 /*return*/, _a.sent()];
                }
            });
        });
    };
    DbStorage.prototype.getRecentLineMovements = function (minutes) {
        return __awaiter(this, void 0, void 0, function () {
            var cutoffTime;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        cutoffTime = new Date();
                        cutoffTime.setMinutes(cutoffTime.getMinutes() - minutes);
                        return [4 /*yield*/, db
                                .select()
                                .from(lineMovements)
                                .where(gte(lineMovements.timestamp, cutoffTime))
                                .orderBy(desc(lineMovements.timestamp))];
                    case 1: return [2 /*return*/, _a.sent()];
                }
            });
        });
    };
    // Discord settings
    DbStorage.prototype.createDiscordSettings = function (settings) {
        return __awaiter(this, void 0, void 0, function () {
            var result;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, db.insert(discordSettings).values(settings).returning()];
                    case 1:
                        result = _a.sent();
                        return [2 /*return*/, result[0]];
                }
            });
        });
    };
    DbStorage.prototype.getDiscordSettings = function (userId) {
        return __awaiter(this, void 0, void 0, function () {
            var result;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, db
                            .select()
                            .from(discordSettings)
                            .where(eq(discordSettings.userId, userId))
                            .limit(1)];
                    case 1:
                        result = _a.sent();
                        return [2 /*return*/, result[0]];
                }
            });
        });
    };
    DbStorage.prototype.updateDiscordSettings = function (userId, settings) {
        return __awaiter(this, void 0, void 0, function () {
            var result;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, db
                            .update(discordSettings)
                            .set(__assign(__assign({}, settings), { updatedAt: new Date() }))
                            .where(eq(discordSettings.userId, userId))
                            .returning()];
                    case 1:
                        result = _a.sent();
                        if (!result[0])
                            throw new Error("Discord settings not found");
                        return [2 /*return*/, result[0]];
                }
            });
        });
    };
    DbStorage.prototype.deleteDiscordSettings = function (userId) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, db.delete(discordSettings).where(eq(discordSettings.userId, userId))];
                    case 1:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        });
    };
    return DbStorage;
}());
// Database is now available - using persistent storage
export var storage = new DbStorage();
// export const storage = new MemStorage(); // Fallback to in-memory if DB unavailable
// Export flag to indicate if we have DATABASE_URL configured
// This doesn't guarantee the DB is accessible, just that it's configured
export var isDatabaseConfigured = !!process.env.DATABASE_URL;
var templateObject_1;
