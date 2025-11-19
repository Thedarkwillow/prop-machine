var __spreadArray = (this && this.__spreadArray) || function (to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
};
/**
 * Normalize player name for consistent comparison
 */
function normalizeName(name) {
    return name.trim().toLowerCase().replace(/\s+/g, ' ');
}
/**
 * Normalize stat name and handle common aliases
 */
function normalizeStat(stat) {
    var normalized = stat.trim().toLowerCase();
    // Comprehensive alias mappings covering all sports
    var aliases = {
        // General abbreviations
        'pts': 'points',
        'ast': 'assists',
        'reb': 'rebounds',
        // NHL stats
        'sog': 'sog',
        'shots on goal': 'sog',
        'goals': 'goals',
        'g': 'goals',
        'assists': 'assists',
        'a': 'assists',
        'points': 'points',
        'p': 'points',
        'saves': 'saves',
        'sv': 'saves',
        // NBA stats
        'rebounds': 'rebounds',
        'threes': 'threes',
        '3pm': 'threes',
        '3-pointers': 'threes',
        'three-pointers': 'threes',
        // NFL stats
        'pass yards': 'pass-yards',
        'passing yards': 'pass-yards',
        'pass yds': 'pass-yards',
        'rush yards': 'rush-yards',
        'rushing yards': 'rush-yards',
        'rush yds': 'rush-yards',
        'rush attempts': 'rush-attempts',
        'rushing attempts': 'rush-attempts',
        'carries': 'rush-attempts',
        'receptions': 'receptions',
        'rec': 'receptions',
        'receiving yards': 'rec-yards',
        'rec yards': 'rec-yards',
        'rec yds': 'rec-yards',
        'pass tds': 'pass-tds',
        'passing tds': 'pass-tds',
        'pass touchdowns': 'pass-tds',
        'passing touchdowns': 'pass-tds',
        'rush tds': 'rush-tds',
        'rushing tds': 'rush-tds',
        'rushing touchdowns': 'rush-tds',
        'fg made': 'fg-made',
        'fgm': 'fg-made',
        'field goals': 'fg-made',
        'field goals made': 'fg-made',
        'td': 'tds',
        'tds': 'tds',
        'touchdowns': 'tds',
        // MLB stats
        'hits': 'hits',
        'h': 'hits',
        'strikeouts': 'strikeouts',
        'k': 'strikeouts',
        'so': 'strikeouts',
        'total bases': 'total-bases',
        'tb': 'total-bases',
        'runs+rbis': 'runs-rbis',
        'runs and rbis': 'runs-rbis',
        'home runs': 'home-runs',
        'hr': 'home-runs',
        'pitcher wins': 'pitcher-wins',
        'wins': 'pitcher-wins',
    };
    return aliases[normalized] || normalized;
}
/**
 * Create order-agnostic game key
 * Both team perspectives (BOS vs NYR and NYR vs BOS) get same key
 * Handles both Date objects and ISO string timestamps
 */
function getGameKey(prop) {
    var teams = [prop.team, prop.opponent].sort();
    var timestamp = prop.gameTime instanceof Date
        ? prop.gameTime.getTime()
        : new Date(prop.gameTime).getTime();
    return "".concat(prop.sport, "-").concat(teams[0], "-").concat(teams[1], "-").concat(timestamp);
}
/**
 * Extract matchup description from game key
 */
function getMatchupFromKey(gameKey) {
    var parts = gameKey.split('-');
    if (parts.length >= 3) {
        return "".concat(parts[1], " vs ").concat(parts[2]);
    }
    return 'unknown matchup';
}
/**
 * Detect correlations between props
 * Returns warnings for correlated picks that increase variance
 */
export function detectCorrelations(props) {
    var warnings = [];
    if (props.length < 2)
        return warnings;
    // Check for same-game correlations (order-agnostic)
    var gameGroups = new Map();
    props.forEach(function (prop) {
        var gameKey = getGameKey(prop);
        var existing = gameGroups.get(gameKey) || [];
        gameGroups.set(gameKey, __spreadArray(__spreadArray([], existing, true), [prop], false));
    });
    gameGroups.forEach(function (groupProps, gameKey) {
        if (groupProps.length >= 2) {
            // Extract matchup from the normalized game key
            var matchup = getMatchupFromKey(gameKey);
            warnings.push({
                type: 'same-game',
                description: "".concat(groupProps.length, " props from the same game (").concat(matchup, ")"),
                severity: 'high',
                propIds: groupProps.map(function (p) { return p.id; }),
            });
        }
    });
    // Check for same-team correlations
    var teamGroups = new Map();
    props.forEach(function (prop) {
        var teamKey = "".concat(prop.sport, "-").concat(prop.team);
        var existing = teamGroups.get(teamKey) || [];
        teamGroups.set(teamKey, __spreadArray(__spreadArray([], existing, true), [prop], false));
    });
    teamGroups.forEach(function (groupProps, teamKey) {
        if (groupProps.length >= 2) {
            // Only warn if not already covered by same-game warning
            var hasSameGameWarning = warnings.some(function (w) {
                return w.type === 'same-game' &&
                    groupProps.every(function (p) { return w.propIds.includes(p.id); });
            });
            if (!hasSameGameWarning) {
                warnings.push({
                    type: 'same-team',
                    description: "".concat(groupProps.length, " props from ").concat(groupProps[0].team, " players"),
                    severity: 'medium',
                    propIds: groupProps.map(function (p) { return p.id; }),
                });
            }
        }
    });
    // Check for same-player correlations (normalized)
    var playerGroups = new Map();
    props.forEach(function (prop) {
        var playerKey = "".concat(prop.sport, "-").concat(normalizeName(prop.player));
        var existing = playerGroups.get(playerKey) || [];
        playerGroups.set(playerKey, __spreadArray(__spreadArray([], existing, true), [prop], false));
    });
    playerGroups.forEach(function (groupProps) {
        if (groupProps.length >= 2) {
            warnings.push({
                type: 'same-player',
                description: "".concat(groupProps.length, " props for ").concat(groupProps[0].player),
                severity: 'high',
                propIds: groupProps.map(function (p) { return p.id; }),
            });
        }
    });
    // Check for stat-related correlations (e.g., Points and Assists for same player)
    // Using normalized stat names
    var relatedStats = {
        'NHL': [['points', 'goals'], ['points', 'assists'], ['sog', 'goals']],
        'NBA': [['points', 'rebounds'], ['points', 'assists'], ['assists', 'rebounds']],
        'NFL': [
            ['pass-yards', 'pass-tds'],
            ['rush-yards', 'rush-attempts'],
            ['rush-yards', 'rush-tds'],
            ['receptions', 'rec-yards']
        ],
        'MLB': [['hits', 'total-bases'], ['strikeouts', 'pitcher-wins'], ['runs-rbis', 'hits']],
    };
    playerGroups.forEach(function (groupProps) {
        if (groupProps.length >= 2) {
            var sport = groupProps[0].sport;
            var related = relatedStats[sport] || [];
            var _loop_1 = function (statPair) {
                var stat1 = statPair[0], stat2 = statPair[1];
                var hasStat1 = groupProps.some(function (p) { return normalizeStat(p.stat) === stat1; });
                var hasStat2 = groupProps.some(function (p) { return normalizeStat(p.stat) === stat2; });
                if (hasStat1 && hasStat2) {
                    var relatedProps = groupProps.filter(function (p) {
                        return normalizeStat(p.stat) === stat1 || normalizeStat(p.stat) === stat2;
                    });
                    warnings.push({
                        type: 'stat-related',
                        description: "".concat(stat1, " and ").concat(stat2, " for ").concat(groupProps[0].player, " are correlated"),
                        severity: 'medium',
                        propIds: relatedProps.map(function (p) { return p.id; }),
                    });
                }
            };
            for (var _i = 0, related_1 = related; _i < related_1.length; _i++) {
                var statPair = related_1[_i];
                _loop_1(statPair);
            }
        }
    });
    return warnings;
}
/**
 * Calculate correlation score (0-1) where 1 is highly correlated
 * Used for auto-slip generation to avoid stacking correlated picks
 */
export function getCorrelationScore(prop1, prop2) {
    var score = 0;
    // Same player = very high correlation (normalized name comparison)
    if (normalizeName(prop1.player) === normalizeName(prop2.player) && prop1.sport === prop2.sport) {
        score += 0.8;
    }
    // Same game = high correlation (order-agnostic)
    if (getGameKey(prop1) === getGameKey(prop2)) {
        score += 0.6;
    }
    // Same team = medium correlation (if not same player)
    if (prop1.sport === prop2.sport &&
        prop1.team === prop2.team &&
        normalizeName(prop1.player) !== normalizeName(prop2.player)) {
        score += 0.3;
    }
    return Math.min(score, 1);
}
/**
 * Check if adding a new prop to existing props would create high correlation
 */
export function hasHighCorrelation(newProp, existingProps, threshold) {
    if (threshold === void 0) { threshold = 0.6; }
    return existingProps.some(function (existing) { return getCorrelationScore(newProp, existing) >= threshold; });
}
