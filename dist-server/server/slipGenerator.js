import { detectCorrelations, hasHighCorrelation } from '../shared/correlations';
export var RISK_PROFILES = {
    conservative: {
        name: 'conservative',
        minConfidence: 60,
        targetProps: [2, 3],
        maxCorrelation: 0.4, // Avoid same-game correlations
    },
    balanced: {
        name: 'balanced',
        minConfidence: 55,
        targetProps: [3, 4],
        maxCorrelation: 0.6, // Allow same-game, but not same-player
    },
    aggressive: {
        name: 'aggressive',
        minConfidence: 50,
        targetProps: [5, 6],
        maxCorrelation: 0.8, // Allow most correlations except same-player same-stat
    },
};
/**
 * Generate optimized slip for a given risk profile
 * Uses greedy algorithm with correlation filtering
 */
export function generateSlipForProfile(availableProps, profile) {
    // Filter props by minimum confidence
    var eligibleProps = availableProps
        .filter(function (p) { return p.confidence >= profile.minConfidence && p.isActive; })
        .sort(function (a, b) { return b.confidence - a.confidence; }); // Sort by confidence descending
    if (eligibleProps.length === 0) {
        return [];
    }
    var selectedProps = [];
    var _a = profile.targetProps, minProps = _a[0], maxProps = _a[1];
    // Greedy selection with correlation filtering
    for (var _i = 0, eligibleProps_1 = eligibleProps; _i < eligibleProps_1.length; _i++) {
        var prop = eligibleProps_1[_i];
        if (selectedProps.length >= maxProps) {
            break;
        }
        // Check correlation with already selected props
        if (selectedProps.length > 0) {
            var wouldCreateHighCorrelation = hasHighCorrelation(prop, selectedProps, profile.maxCorrelation);
            if (wouldCreateHighCorrelation) {
                continue; // Skip this prop, try next one
            }
        }
        selectedProps.push(prop);
    }
    // Only return slip if we met minimum requirements
    if (selectedProps.length >= minProps) {
        return selectedProps;
    }
    return [];
}
/**
 * Generate all 3 daily slips (conservative, balanced, aggressive)
 */
export function generateDailySlips(availableProps) {
    return {
        conservative: generateSlipForProfile(availableProps, RISK_PROFILES.conservative),
        balanced: generateSlipForProfile(availableProps, RISK_PROFILES.balanced),
        aggressive: generateSlipForProfile(availableProps, RISK_PROFILES.aggressive),
    };
}
/**
 * Calculate suggested bet amount using Kelly Criterion
 */
export function calculateKellyBet(props, bankroll, kellyMultiplier) {
    if (kellyMultiplier === void 0) { kellyMultiplier = 0.25; }
    if (props.length === 0 || isNaN(bankroll) || bankroll <= 0)
        return 5;
    // For parlays, use average confidence as win probability
    var avgConfidence = props.reduce(function (sum, p) { return sum + p.confidence; }, 0) / props.length;
    var winProbability = avgConfidence / 100;
    // Simplified odds calculation (would be more complex in production)
    var avgOdds = 1.91; // Typical prop odds
    var parlayOdds = Math.pow(avgOdds, props.length);
    // Kelly formula: f = (bp - q) / b
    // where b = odds-1, p = win probability, q = 1-p
    var b = parlayOdds - 1;
    var q = 1 - winProbability;
    var kellyFraction = (b * winProbability - q) / b;
    // Guard against negative or invalid Kelly fractions
    if (isNaN(kellyFraction) || kellyFraction <= 0) {
        // If Kelly suggests not betting, use conservative 1% of bankroll
        return Math.max(5, bankroll * 0.01);
    }
    // Apply fractional Kelly and ensure minimum bet of $5
    var betAmount = Math.max(5, bankroll * kellyFraction * kellyMultiplier);
    // Cap at 10% of bankroll for safety
    return Math.min(betAmount, bankroll * 0.1);
}
/**
 * Format slip for display/storage
 */
export function formatSlip(props, profile, bankroll, kellyMultiplier) {
    var suggestedBet = calculateKellyBet(props, bankroll, kellyMultiplier);
    var avgOdds = 1.91;
    var parlayOdds = Math.pow(avgOdds, props.length);
    var potentialReturn = suggestedBet * parlayOdds;
    var avgConfidence = props.reduce(function (sum, p) { return sum + p.confidence; }, 0) / props.length;
    // Get unique platforms
    var platforms = Array.from(new Set(props.map(function (p) { return p.platform; })));
    var platform = platforms.length === 1 ? platforms[0] : 'Multiple';
    // Format picks for display
    var picks = props.map(function (p) { return ({
        propId: p.id,
        player: p.player,
        stat: p.stat,
        line: p.line,
        direction: p.direction,
        confidence: p.confidence,
    }); });
    // Detect any warnings
    var warnings = detectCorrelations(props);
    return {
        title: "".concat(profile.name.charAt(0).toUpperCase() + profile.name.slice(1), " ").concat(props.length, "-Pick"),
        type: profile.name,
        picks: picks,
        confidence: Math.round(avgConfidence),
        suggestedBet: suggestedBet.toFixed(2),
        potentialReturn: potentialReturn.toFixed(2),
        platform: platform,
        warnings: warnings.length,
    };
}
