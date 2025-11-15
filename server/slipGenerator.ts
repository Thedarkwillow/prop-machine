import type { Prop } from '../shared/schema';
import { detectCorrelations, getCorrelationScore, hasHighCorrelation } from '../shared/correlations';

export interface RiskProfile {
  name: 'conservative' | 'balanced' | 'aggressive';
  minConfidence: number;
  targetProps: [number, number]; // [min, max] number of props
  maxCorrelation: number; // Maximum correlation score allowed between props
}

export const RISK_PROFILES: Record<string, RiskProfile> = {
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
export function generateSlipForProfile(
  availableProps: Prop[],
  profile: RiskProfile
): Prop[] {
  // Filter props by minimum confidence
  const eligibleProps = availableProps
    .filter(p => p.confidence >= profile.minConfidence && p.isActive)
    .sort((a, b) => b.confidence - a.confidence); // Sort by confidence descending

  if (eligibleProps.length === 0) {
    return [];
  }

  const selectedProps: Prop[] = [];
  const [minProps, maxProps] = profile.targetProps;

  // Greedy selection with correlation filtering
  for (const prop of eligibleProps) {
    if (selectedProps.length >= maxProps) {
      break;
    }

    // Check correlation with already selected props
    if (selectedProps.length > 0) {
      const wouldCreateHighCorrelation = hasHighCorrelation(
        prop,
        selectedProps,
        profile.maxCorrelation
      );

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
export function generateDailySlips(availableProps: Prop[]): {
  conservative: Prop[];
  balanced: Prop[];
  aggressive: Prop[];
} {
  return {
    conservative: generateSlipForProfile(availableProps, RISK_PROFILES.conservative),
    balanced: generateSlipForProfile(availableProps, RISK_PROFILES.balanced),
    aggressive: generateSlipForProfile(availableProps, RISK_PROFILES.aggressive),
  };
}

/**
 * Calculate suggested bet amount using Kelly Criterion
 */
export function calculateKellyBet(
  props: Prop[],
  bankroll: number,
  kellyMultiplier: number = 0.25
): number {
  if (props.length === 0 || isNaN(bankroll) || bankroll <= 0) return 5;

  // For parlays, use average confidence as win probability
  const avgConfidence = props.reduce((sum, p) => sum + p.confidence, 0) / props.length;
  const winProbability = avgConfidence / 100;

  // Simplified odds calculation (would be more complex in production)
  const avgOdds = 1.91; // Typical prop odds
  const parlayOdds = Math.pow(avgOdds, props.length);

  // Kelly formula: f = (bp - q) / b
  // where b = odds-1, p = win probability, q = 1-p
  const b = parlayOdds - 1;
  const q = 1 - winProbability;
  const kellyFraction = (b * winProbability - q) / b;

  // Guard against negative or invalid Kelly fractions
  if (isNaN(kellyFraction) || kellyFraction <= 0) {
    // If Kelly suggests not betting, use conservative 1% of bankroll
    return Math.max(5, bankroll * 0.01);
  }

  // Apply fractional Kelly and ensure minimum bet of $5
  const betAmount = Math.max(5, bankroll * kellyFraction * kellyMultiplier);

  // Cap at 10% of bankroll for safety
  return Math.min(betAmount, bankroll * 0.1);
}

/**
 * Format slip for display/storage
 */
export function formatSlip(
  props: Prop[],
  profile: RiskProfile,
  bankroll: number,
  kellyMultiplier: number
) {
  const suggestedBet = calculateKellyBet(props, bankroll, kellyMultiplier);
  const avgOdds = 1.91;
  const parlayOdds = Math.pow(avgOdds, props.length);
  const potentialReturn = suggestedBet * parlayOdds;
  const avgConfidence = props.reduce((sum, p) => sum + p.confidence, 0) / props.length;

  // Get unique platforms
  const platforms = Array.from(new Set(props.map(p => p.platform)));
  const platform = platforms.length === 1 ? platforms[0] : 'Multiple';

  // Format picks for display
  const picks = props.map(p => ({
    propId: p.id,
    player: p.player,
    stat: p.stat,
    line: p.line,
    direction: p.direction,
    confidence: p.confidence,
  }));

  // Detect any warnings
  const warnings = detectCorrelations(props);

  return {
    title: `${profile.name.charAt(0).toUpperCase() + profile.name.slice(1)} ${props.length}-Pick`,
    type: profile.name,
    picks,
    confidence: Math.round(avgConfidence),
    suggestedBet: suggestedBet.toFixed(2),
    potentialReturn: potentialReturn.toFixed(2),
    platform,
    warnings: warnings.length,
  };
}
