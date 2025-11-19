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
import { storage } from "../storage";
var IntegrationClient = /** @class */ (function () {
    function IntegrationClient(baseUrl, rateLimitConfig, cacheConfig, headers) {
        if (cacheConfig === void 0) { cacheConfig = { ttl: 300, useETag: true, useLastModified: true }; }
        if (headers === void 0) { headers = {}; }
        this.baseUrl = baseUrl;
        this.rateLimitConfig = rateLimitConfig;
        this.cacheConfig = cacheConfig;
        this.defaultHeaders = __assign({ 'User-Agent': 'PropMachine/1.0' }, headers);
    }
    IntegrationClient.prototype.checkRateLimit = function () {
        return __awaiter(this, void 0, void 0, function () {
            var limit, error_1, now, lastReset, timeSinceReset, error_2;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 9, , 10]);
                        return [4 /*yield*/, storage.getProviderLimit(this.rateLimitConfig.provider)];
                    case 1:
                        limit = _a.sent();
                        if (!!limit) return [3 /*break*/, 6];
                        _a.label = 2;
                    case 2:
                        _a.trys.push([2, 4, , 6]);
                        return [4 /*yield*/, storage.createProviderLimit(this.rateLimitConfig)];
                    case 3:
                        limit = _a.sent();
                        return [3 /*break*/, 6];
                    case 4:
                        error_1 = _a.sent();
                        return [4 /*yield*/, storage.getProviderLimit(this.rateLimitConfig.provider)];
                    case 5:
                        // If creation fails (race condition), try to get it again
                        limit = _a.sent();
                        if (!limit) {
                            console.warn("Could not create or retrieve provider limit for ".concat(this.rateLimitConfig.provider));
                            return [2 /*return*/, true]; // Allow request to proceed
                        }
                        return [3 /*break*/, 6];
                    case 6:
                        now = new Date();
                        lastReset = new Date(limit.lastReset);
                        timeSinceReset = (now.getTime() - lastReset.getTime()) / 1000;
                        if (!(timeSinceReset >= 86400)) return [3 /*break*/, 8];
                        return [4 /*yield*/, storage.updateProviderLimit(this.rateLimitConfig.provider, {
                                currentMinute: 0,
                                currentHour: 0,
                                currentDay: 0,
                                lastReset: now,
                                updatedAt: now,
                            })];
                    case 7:
                        _a.sent();
                        return [2 /*return*/, true];
                    case 8:
                        if (limit.currentDay >= this.rateLimitConfig.requestsPerDay) {
                            console.warn("Daily rate limit exceeded for ".concat(this.rateLimitConfig.provider));
                            return [2 /*return*/, false];
                        }
                        if (limit.currentHour >= this.rateLimitConfig.requestsPerHour) {
                            console.warn("Hourly rate limit exceeded for ".concat(this.rateLimitConfig.provider));
                            return [2 /*return*/, false];
                        }
                        if (limit.currentMinute >= this.rateLimitConfig.requestsPerMinute) {
                            console.warn("Minute rate limit exceeded for ".concat(this.rateLimitConfig.provider));
                            return [2 /*return*/, false];
                        }
                        return [2 /*return*/, true];
                    case 9:
                        error_2 = _a.sent();
                        console.error("Rate limit check error for ".concat(this.rateLimitConfig.provider, ":"), error_2);
                        return [2 /*return*/, true];
                    case 10: return [2 /*return*/];
                }
            });
        });
    };
    IntegrationClient.prototype.incrementRateLimit = function () {
        return __awaiter(this, void 0, void 0, function () {
            var limit, error_3, error_4;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 10, , 11]);
                        return [4 /*yield*/, storage.getProviderLimit(this.rateLimitConfig.provider)];
                    case 1:
                        limit = _a.sent();
                        if (!!limit) return [3 /*break*/, 6];
                        _a.label = 2;
                    case 2:
                        _a.trys.push([2, 4, , 6]);
                        return [4 /*yield*/, storage.createProviderLimit(this.rateLimitConfig)];
                    case 3:
                        limit = _a.sent();
                        return [3 /*break*/, 6];
                    case 4:
                        error_3 = _a.sent();
                        return [4 /*yield*/, storage.getProviderLimit(this.rateLimitConfig.provider)];
                    case 5:
                        // If creation fails, try to get it again
                        limit = _a.sent();
                        return [3 /*break*/, 6];
                    case 6:
                        if (!limit) return [3 /*break*/, 8];
                        return [4 /*yield*/, storage.updateProviderLimit(this.rateLimitConfig.provider, {
                                currentMinute: limit.currentMinute + 1,
                                currentHour: limit.currentHour + 1,
                                currentDay: limit.currentDay + 1,
                                updatedAt: new Date(),
                            })];
                    case 7:
                        _a.sent();
                        return [3 /*break*/, 9];
                    case 8:
                        console.warn("Could not increment rate limit for ".concat(this.rateLimitConfig.provider, " - no limit record found"));
                        _a.label = 9;
                    case 9: return [3 /*break*/, 11];
                    case 10:
                        error_4 = _a.sent();
                        console.error("Rate limit increment error for ".concat(this.rateLimitConfig.provider, ":"), error_4);
                        return [3 /*break*/, 11];
                    case 11: return [2 /*return*/];
                }
            });
        });
    };
    IntegrationClient.prototype.get = function (endpoint_1) {
        return __awaiter(this, arguments, void 0, function (endpoint, options) {
            var canProceed, cached, url, headers, response, errorBody, errorData, _a, data, etag, lastModified, error_5, cached;
            if (options === void 0) { options = {}; }
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0: return [4 /*yield*/, this.checkRateLimit()];
                    case 1:
                        canProceed = _b.sent();
                        if (!!canProceed) return [3 /*break*/, 3];
                        return [4 /*yield*/, this.getCachedResponse(endpoint)];
                    case 2:
                        cached = _b.sent();
                        if (cached) {
                            return [2 /*return*/, { data: cached, cached: true }];
                        }
                        throw new Error("Rate limit exceeded for ".concat(this.rateLimitConfig.provider, " and no cached data available"));
                    case 3:
                        url = "".concat(this.baseUrl).concat(endpoint);
                        headers = __assign(__assign({}, this.defaultHeaders), options.headers);
                        _b.label = 4;
                    case 4:
                        _b.trys.push([4, 14, , 16]);
                        return [4 /*yield*/, fetch(url, __assign(__assign({}, options), { method: 'GET', headers: headers }))];
                    case 5:
                        response = _b.sent();
                        if (!!response.ok) return [3 /*break*/, 10];
                        errorBody = '';
                        _b.label = 6;
                    case 6:
                        _b.trys.push([6, 8, , 9]);
                        return [4 /*yield*/, response.json()];
                    case 7:
                        errorData = _b.sent();
                        errorBody = JSON.stringify(errorData);
                        return [3 /*break*/, 9];
                    case 8:
                        _a = _b.sent();
                        errorBody = response.statusText;
                        return [3 /*break*/, 9];
                    case 9: throw new Error("HTTP ".concat(response.status, ": ").concat(errorBody));
                    case 10: return [4 /*yield*/, this.incrementRateLimit()];
                    case 11:
                        _b.sent();
                        return [4 /*yield*/, response.json()];
                    case 12:
                        data = _b.sent();
                        etag = response.headers.get('etag') || undefined;
                        lastModified = response.headers.get('last-modified') || undefined;
                        return [4 /*yield*/, this.cacheResponse(endpoint, data, etag, lastModified)];
                    case 13:
                        _b.sent();
                        return [2 /*return*/, { data: data, cached: false, etag: etag, lastModified: lastModified }];
                    case 14:
                        error_5 = _b.sent();
                        console.error("Integration error for ".concat(this.rateLimitConfig.provider, ":"), error_5);
                        return [4 /*yield*/, this.getCachedResponse(endpoint)];
                    case 15:
                        cached = _b.sent();
                        if (cached) {
                            return [2 /*return*/, { data: cached, cached: true }];
                        }
                        throw error_5;
                    case 16: return [2 /*return*/];
                }
            });
        });
    };
    IntegrationClient.prototype.retryWithBackoff = function (fn_1) {
        return __awaiter(this, arguments, void 0, function (fn, maxRetries, initialDelay) {
            var lastError, _loop_1, attempt, state_1;
            if (maxRetries === void 0) { maxRetries = 3; }
            if (initialDelay === void 0) { initialDelay = 1000; }
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _loop_1 = function (attempt) {
                            var _b, error_6, delay_1;
                            return __generator(this, function (_c) {
                                switch (_c.label) {
                                    case 0:
                                        _c.trys.push([0, 2, , 5]);
                                        _b = {};
                                        return [4 /*yield*/, fn()];
                                    case 1: return [2 /*return*/, (_b.value = _c.sent(), _b)];
                                    case 2:
                                        error_6 = _c.sent();
                                        lastError = error_6;
                                        if (!(attempt < maxRetries - 1)) return [3 /*break*/, 4];
                                        delay_1 = initialDelay * Math.pow(2, attempt);
                                        return [4 /*yield*/, new Promise(function (resolve) { return setTimeout(resolve, delay_1); })];
                                    case 3:
                                        _c.sent();
                                        _c.label = 4;
                                    case 4: return [3 /*break*/, 5];
                                    case 5: return [2 /*return*/];
                                }
                            });
                        };
                        attempt = 0;
                        _a.label = 1;
                    case 1:
                        if (!(attempt < maxRetries)) return [3 /*break*/, 4];
                        return [5 /*yield**/, _loop_1(attempt)];
                    case 2:
                        state_1 = _a.sent();
                        if (typeof state_1 === "object")
                            return [2 /*return*/, state_1.value];
                        _a.label = 3;
                    case 3:
                        attempt++;
                        return [3 /*break*/, 1];
                    case 4: throw lastError || new Error('Max retries exceeded');
                }
            });
        });
    };
    IntegrationClient.prototype.cacheResponse = function (endpoint, data, etag, lastModified) {
        return __awaiter(this, void 0, void 0, function () {
            var error_7;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 2, , 3]);
                        return [4 /*yield*/, storage.createDataFeed({
                                provider: this.rateLimitConfig.provider,
                                endpoint: endpoint,
                                response: data,
                                etag: etag,
                                lastModified: lastModified,
                            })];
                    case 1:
                        _a.sent();
                        return [3 /*break*/, 3];
                    case 2:
                        error_7 = _a.sent();
                        console.error('Cache write error:', error_7);
                        return [3 /*break*/, 3];
                    case 3: return [2 /*return*/];
                }
            });
        });
    };
    IntegrationClient.prototype.getCachedResponse = function (endpoint) {
        return __awaiter(this, void 0, void 0, function () {
            var feeds, latest, age, error_8;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 2, , 3]);
                        return [4 /*yield*/, storage.getDataFeeds(this.rateLimitConfig.provider, endpoint)];
                    case 1:
                        feeds = _a.sent();
                        if (feeds.length > 0) {
                            latest = feeds[0];
                            age = Date.now() - new Date(latest.createdAt).getTime();
                            if (age < this.cacheConfig.ttl * 1000) {
                                return [2 /*return*/, latest.response];
                            }
                        }
                        return [3 /*break*/, 3];
                    case 2:
                        error_8 = _a.sent();
                        console.error('Cache read error:', error_8);
                        return [3 /*break*/, 3];
                    case 3: return [2 /*return*/, null];
                }
            });
        });
    };
    return IntegrationClient;
}());
export { IntegrationClient };
