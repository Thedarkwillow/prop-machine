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
import { propRefreshService } from './propRefreshService';
var PropSchedulerService = /** @class */ (function () {
    function PropSchedulerService() {
        this.intervalId = null;
        this.isRunning = false;
        this.refreshIntervalMinutes = 15;
        this.lastRefreshTime = null;
        this.lastSuccessfulRefresh = null;
        this.lastError = null;
    }
    /**
     * Start the automatic prop refresh scheduler
     * Runs every 15 minutes by default
     */
    PropSchedulerService.prototype.start = function (intervalMinutes) {
        var _this = this;
        if (intervalMinutes === void 0) { intervalMinutes = 15; }
        if (this.isRunning) {
            console.log('Prop scheduler is already running');
            return;
        }
        this.refreshIntervalMinutes = intervalMinutes;
        var intervalMs = intervalMinutes * 60 * 1000;
        console.log("Starting prop refresh scheduler (every ".concat(intervalMinutes, " minutes)"));
        // Run immediately on start
        this.runRefresh();
        // Then run on interval
        this.intervalId = setInterval(function () {
            _this.runRefresh();
        }, intervalMs);
        this.isRunning = true;
    };
    /**
     * Stop the scheduler
     */
    PropSchedulerService.prototype.stop = function () {
        if (this.intervalId) {
            clearInterval(this.intervalId);
            this.intervalId = null;
            this.isRunning = false;
            console.log('Prop refresh scheduler stopped');
        }
    };
    /**
     * Get scheduler status
     */
    PropSchedulerService.prototype.getStatus = function () {
        var nextRefresh = null;
        if (this.isRunning && this.lastRefreshTime) {
            nextRefresh = new Date(this.lastRefreshTime.getTime() + this.refreshIntervalMinutes * 60 * 1000);
        }
        return {
            isRunning: this.isRunning,
            intervalMinutes: this.refreshIntervalMinutes,
            lastRefresh: this.lastRefreshTime,
            lastSuccessfulRefresh: this.lastSuccessfulRefresh,
            lastError: this.lastError,
            nextRefresh: nextRefresh,
        };
    };
    /**
     * Execute a prop refresh across all sports and platforms
     */
    PropSchedulerService.prototype.runRefresh = function () {
        return __awaiter(this, void 0, void 0, function () {
            var sports, result, error_1, err;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        this.lastRefreshTime = new Date();
                        _a.label = 1;
                    case 1:
                        _a.trys.push([1, 3, , 4]);
                        console.log('\n========================================');
                        console.log('🔄 Running scheduled prop refresh...');
                        console.log("\u23F0 Time: ".concat(new Date().toLocaleString()));
                        console.log('========================================\n');
                        sports = ['NBA', 'NFL', 'NHL'];
                        return [4 /*yield*/, propRefreshService.refreshAllPlatforms(sports)];
                    case 2:
                        result = _a.sent();
                        // Consider successful if API calls succeeded (even if no new props created due to duplicates)
                        if (result.success) {
                            this.lastSuccessfulRefresh = new Date();
                            this.lastError = null;
                            console.log('\n========================================');
                            console.log('✅ Scheduled prop refresh completed');
                            console.log("\uD83D\uDCCA Total props fetched: ".concat(result.totalPropsFetched));
                            console.log("\u2728 Total props created: ".concat(result.totalPropsCreated));
                            console.log("\u274C Total errors: ".concat(result.totalErrors));
                            console.log("\u23F0 Next refresh: ".concat(new Date(Date.now() + this.refreshIntervalMinutes * 60 * 1000).toLocaleTimeString()));
                            console.log('========================================\n');
                            // Log individual platform results
                            result.results.forEach(function (r) {
                                console.log("  ".concat(r.platform, " (").concat(r.sport, "): ").concat(r.propsCreated, "/").concat(r.propsFetched, " props created"));
                                if (r.errors.length > 0) {
                                    console.log("    \u26A0\uFE0F  Errors: ".concat(r.errors.slice(0, 3).join(', ')));
                                }
                            });
                        }
                        else {
                            // All platforms failed
                            this.lastError = "Refresh failed. Fetched: ".concat(result.totalPropsFetched, ", Errors: ").concat(result.totalErrors);
                            console.error('❌ Prop refresh failed - all platforms returned errors');
                        }
                        return [3 /*break*/, 4];
                    case 3:
                        error_1 = _a.sent();
                        err = error_1;
                        this.lastError = err.message;
                        console.error('❌ Scheduled prop refresh failed:', err.message);
                        console.error(error_1);
                        return [3 /*break*/, 4];
                    case 4: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Manually trigger a refresh (updates scheduler status)
     */
    PropSchedulerService.prototype.triggerManualRefresh = function (sports) {
        return __awaiter(this, void 0, void 0, function () {
            var targetSports, result;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        console.log('🔄 Manual prop refresh triggered');
                        targetSports = sports || ['NBA', 'NFL', 'NHL'];
                        this.lastRefreshTime = new Date();
                        return [4 /*yield*/, propRefreshService.refreshAllPlatforms(targetSports)];
                    case 1:
                        result = _a.sent();
                        // Consider successful if API calls succeeded (even if no new props created due to duplicates)
                        if (result.success) {
                            this.lastSuccessfulRefresh = new Date();
                            this.lastError = null;
                            console.log("\u2705 Manual refresh completed - Fetched: ".concat(result.totalPropsFetched, ", Created: ").concat(result.totalPropsCreated));
                        }
                        else {
                            this.lastError = "Manual refresh failed. Fetched: ".concat(result.totalPropsFetched, ", Errors: ").concat(result.totalErrors);
                            console.error('❌ Manual refresh failed - all platforms returned errors');
                        }
                        return [2 /*return*/, result];
                }
            });
        });
    };
    return PropSchedulerService;
}());
export var propSchedulerService = new PropSchedulerService();
