import type { Prop } from './schema';

export type CorrelationType = 'same-game' | 'same-team' | 'same-player' | 'stat-related';

export interface CorrelationWarning {
  type: CorrelationType;
  description: string;
  severity: 'high' | 'medium' | 'low';
  propIds: number[];
}

/**
 * Normalize player name for consistent comparison
 */
function normalizeName(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, ' ');
}

/**
 * Normalize stat name and handle common aliases
 */
function normalizeStat(stat: string): string {
  const normalized = stat.trim().toLowerCase();
  
  // Comprehensive alias mappings covering all sports
  const aliases: Record<string, string> = {
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
function getGameKey(prop: Prop): string {
  const teams = [prop.team, prop.opponent].sort();
  const timestamp = prop.gameTime instanceof Date 
    ? prop.gameTime.getTime() 
    : new Date(prop.gameTime).getTime();
  return `${prop.sport}-${teams[0]}-${teams[1]}-${timestamp}`;
}

/**
 * Extract matchup description from game key
 */
function getMatchupFromKey(gameKey: string): string {
  const parts = gameKey.split('-');
  if (parts.length >= 3) {
    return `${parts[1]} vs ${parts[2]}`;
  }
  return 'unknown matchup';
}

/**
 * Detect correlations between props
 * Returns warnings for correlated picks that increase variance
 */
export function detectCorrelations(props: Prop[]): CorrelationWarning[] {
  const warnings: CorrelationWarning[] = [];

  if (props.length < 2) return warnings;

  // Check for same-game correlations (order-agnostic)
  const gameGroups = new Map<string, Prop[]>();
  props.forEach(prop => {
    const gameKey = getGameKey(prop);
    const existing = gameGroups.get(gameKey) || [];
    gameGroups.set(gameKey, [...existing, prop]);
  });

  gameGroups.forEach((groupProps, gameKey) => {
    if (groupProps.length >= 2) {
      // Extract matchup from the normalized game key
      const matchup = getMatchupFromKey(gameKey);
      
      warnings.push({
        type: 'same-game',
        description: `${groupProps.length} props from the same game (${matchup})`,
        severity: 'high',
        propIds: groupProps.map(p => p.id),
      });
    }
  });

  // Check for same-team correlations
  const teamGroups = new Map<string, Prop[]>();
  props.forEach(prop => {
    const teamKey = `${prop.sport}-${prop.team}`;
    const existing = teamGroups.get(teamKey) || [];
    teamGroups.set(teamKey, [...existing, prop]);
  });

  teamGroups.forEach((groupProps, teamKey) => {
    if (groupProps.length >= 2) {
      // Only warn if not already covered by same-game warning
      const hasSameGameWarning = warnings.some(w => 
        w.type === 'same-game' && 
        groupProps.every(p => w.propIds.includes(p.id))
      );
      
      if (!hasSameGameWarning) {
        warnings.push({
          type: 'same-team',
          description: `${groupProps.length} props from ${groupProps[0].team} players`,
          severity: 'medium',
          propIds: groupProps.map(p => p.id),
        });
      }
    }
  });

  // Check for same-player correlations (normalized)
  const playerGroups = new Map<string, Prop[]>();
  props.forEach(prop => {
    const playerKey = `${prop.sport}-${normalizeName(prop.player)}`;
    const existing = playerGroups.get(playerKey) || [];
    playerGroups.set(playerKey, [...existing, prop]);
  });

  playerGroups.forEach(groupProps => {
    if (groupProps.length >= 2) {
      warnings.push({
        type: 'same-player',
        description: `${groupProps.length} props for ${groupProps[0].player}`,
        severity: 'high',
        propIds: groupProps.map(p => p.id),
      });
    }
  });

  // Check for stat-related correlations (e.g., Points and Assists for same player)
  // Using normalized stat names
  const relatedStats: Record<string, [string, string][]> = {
    'NHL': [['points', 'goals'], ['points', 'assists'], ['sog', 'goals']],
    'NBA': [['points', 'rebounds'], ['points', 'assists'], ['assists', 'rebounds']],
    'NFL': [['pass-yards', 'pass-tds'], ['rush-yards', 'receptions'], ['receptions', 'rec-yards']],
    'MLB': [['hits', 'total-bases'], ['strikeouts', 'pitcher-wins'], ['runs-rbis', 'hits']],
  };

  playerGroups.forEach(groupProps => {
    if (groupProps.length >= 2) {
      const sport = groupProps[0].sport;
      const related = relatedStats[sport] || [];
      
      for (const statPair of related) {
        const [stat1, stat2] = statPair;
        const hasStat1 = groupProps.some(p => normalizeStat(p.stat) === stat1);
        const hasStat2 = groupProps.some(p => normalizeStat(p.stat) === stat2);
        
        if (hasStat1 && hasStat2) {
          const relatedProps = groupProps.filter(p => 
            normalizeStat(p.stat) === stat1 || normalizeStat(p.stat) === stat2
          );
          warnings.push({
            type: 'stat-related',
            description: `${stat1} and ${stat2} for ${groupProps[0].player} are correlated`,
            severity: 'medium',
            propIds: relatedProps.map(p => p.id),
          });
        }
      }
    }
  });

  return warnings;
}

/**
 * Calculate correlation score (0-1) where 1 is highly correlated
 * Used for auto-slip generation to avoid stacking correlated picks
 */
export function getCorrelationScore(prop1: Prop, prop2: Prop): number {
  let score = 0;

  // Same player = very high correlation (normalized name comparison)
  if (normalizeName(prop1.player) === normalizeName(prop2.player) && prop1.sport === prop2.sport) {
    score += 0.8;
  }

  // Same game = high correlation (order-agnostic)
  if (getGameKey(prop1) === getGameKey(prop2)) {
    score += 0.6;
  }

  // Same team = medium correlation (if not same player)
  if (
    prop1.sport === prop2.sport && 
    prop1.team === prop2.team && 
    normalizeName(prop1.player) !== normalizeName(prop2.player)
  ) {
    score += 0.3;
  }

  return Math.min(score, 1);
}

/**
 * Check if adding a new prop to existing props would create high correlation
 */
export function hasHighCorrelation(newProp: Prop, existingProps: Prop[], threshold = 0.6): boolean {
  return existingProps.some(existing => getCorrelationScore(newProp, existing) >= threshold);
}
