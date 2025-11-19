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
var ModelScorer = /** @class */ (function () {
    function ModelScorer() {
    }
    /**
     * Score a prop bet using statistical analysis
     */
    ModelScorer.prototype.scoreProp = function (features) {
        return __awaiter(this, void 0, void 0, function () {
            var reasoning, baseConfidence, recentDiff, recentImpact, consistency, consistencyImpact, matchupImpact, movementImpact, homeBonus, confidence, modelProbability, impliedOdds, expectedValue, kellyFraction;
            return __generator(this, function (_a) {
                reasoning = [];
                baseConfidence = 50;
                // Factor 1: Player performance vs line (most important)
                if (features.recentAverage !== undefined) {
                    recentDiff = features.direction === 'over'
                        ? features.recentAverage - features.line
                        : features.line - features.recentAverage;
                    recentImpact = Math.min(Math.max(recentDiff * 5, -15), 15);
                    baseConfidence += recentImpact;
                    if (recentImpact > 0) {
                        reasoning.push("Recent avg (".concat(features.recentAverage.toFixed(1), ") ").concat(features.direction === 'over' ? 'above' : 'below', " line by ").concat(Math.abs(recentDiff).toFixed(1)));
                    }
                }
                // Factor 2: Season average consistency
                if (features.seasonAverage !== undefined && features.recentAverage !== undefined) {
                    consistency = 1 - Math.abs(features.seasonAverage - features.recentAverage) / features.line;
                    consistencyImpact = consistency * 8;
                    baseConfidence += consistencyImpact;
                    if (consistency > 0.9) {
                        reasoning.push("High consistency between recent and season performance");
                    }
                }
                // Factor 3: Opponent matchup
                if (features.opponentRanking !== undefined) {
                    matchupImpact = features.direction === 'over'
                        ? (30 - features.opponentRanking) / 3 // Easier opponent = higher confidence for over
                        : (features.opponentRanking - 15) / 3;
                    baseConfidence += matchupImpact;
                    if (Math.abs(matchupImpact) > 3) {
                        reasoning.push("".concat(features.opponentRanking <= 10 ? 'Strong' : features.opponentRanking >= 25 ? 'Weak' : 'Average', " opponent matchup"));
                    }
                }
                // Factor 4: Line movement (sharp money indicator)
                if (features.lineMovement !== undefined) {
                    movementImpact = features.direction === 'over'
                        ? Math.min(features.lineMovement * 2, 10) // Line moved up = good for over
                        : Math.min(-features.lineMovement * 2, 10);
                    baseConfidence += movementImpact;
                    if (Math.abs(features.lineMovement) > 0.5) {
                        reasoning.push("Line moved ".concat(features.lineMovement > 0 ? 'up' : 'down', " ").concat(Math.abs(features.lineMovement).toFixed(1), " (").concat(movementImpact > 0 ? 'favorable' : 'unfavorable', ")"));
                    }
                }
                // Factor 5: Home/away split (sport-specific)
                if (features.homeAway) {
                    homeBonus = features.homeAway === 'home' ? 3 : -2;
                    baseConfidence += homeBonus;
                    if (features.homeAway === 'home') {
                        reasoning.push("Home game advantage");
                    }
                }
                confidence = Math.min(Math.max(baseConfidence, 50), 95);
                modelProbability = 0.45 + (confidence / 200);
                impliedOdds = 1 / 1.909;
                expectedValue = ((modelProbability - impliedOdds) / impliedOdds) * 100;
                kellyFraction = Math.max((modelProbability * 1.909 - 1) / (1.909 - 1), 0) * 0.25;
                // Add final summary
                if (confidence >= 80) {
                    reasoning.push("Strong ".concat(features.direction, " play with high confidence"));
                }
                else if (confidence >= 70) {
                    reasoning.push("Solid ".concat(features.direction, " play with good value"));
                }
                else if (confidence >= 60) {
                    reasoning.push("Moderate ".concat(features.direction, " play, proceed with caution"));
                }
                else {
                    reasoning.push("Weak play, consider passing");
                }
                return [2 /*return*/, {
                        confidence: Math.round(confidence),
                        expectedValue: parseFloat(expectedValue.toFixed(2)),
                        modelProbability: parseFloat(modelProbability.toFixed(4)),
                        kellyFraction: parseFloat(kellyFraction.toFixed(4)),
                        reasoning: reasoning,
                    }];
            });
        });
    };
    /**
     * Calculate suggested bet size using Kelly criterion
     */
    ModelScorer.prototype.calculateBetSize = function (bankroll, kellyFraction, maxBetPercentage // Max 5% of bankroll per bet
    ) {
        if (maxBetPercentage === void 0) { maxBetPercentage = 0.05; }
        var kellySuggestion = bankroll * kellyFraction;
        var maxBet = bankroll * maxBetPercentage;
        return Math.min(kellySuggestion, maxBet);
    };
    /**
     * Evaluate parlay confidence (multiplicative probability)
     */
    ModelScorer.prototype.evaluateParlay = function (individualScores) {
        // Multiply probabilities for parlay
        var combinedProbability = individualScores.reduce(function (acc, score) { return acc * score.modelProbability; }, 1);
        // Average confidence (conservative approach)
        var avgConfidence = individualScores.reduce(function (acc, score) { return acc + score.confidence; }, 0) / individualScores.length;
        // Parlay confidence is lower than average (risk compounds)
        var combinedConfidence = Math.max(avgConfidence - (individualScores.length - 1) * 5, 50);
        // Calculate parlay odds (2-leg = 4x, 3-leg = 10x, 4-leg = 25x, 5-leg = 50x)
        var parlayOdds = Math.pow(2.5, individualScores.length);
        var impliedOdds = 1 / parlayOdds;
        var expectedValue = ((combinedProbability - impliedOdds) / impliedOdds) * 100;
        // Conservative Kelly for parlays (1/8 Kelly)
        var kellyFraction = Math.max((combinedProbability * parlayOdds - 1) / (parlayOdds - 1), 0) * 0.125;
        return {
            combinedConfidence: Math.round(combinedConfidence),
            combinedProbability: parseFloat(combinedProbability.toFixed(4)),
            expectedValue: parseFloat(expectedValue.toFixed(2)),
            suggestedBet: kellyFraction,
        };
    };
    return ModelScorer;
}());
export { ModelScorer };
export var modelScorer = new ModelScorer();
