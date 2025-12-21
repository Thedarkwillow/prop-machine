import type { InsertProp } from '@shared/schema.js';

export interface RawProp {
  player: string;
  stat: string;
  line: number;
  direction: 'over' | 'under' | null;
  sport: string;
  team?: string | null;
  opponent?: string | null;
  gameTime?: Date | null;
}

/**
 * Normalize sport name to valid enum value
 */
function normalizeSport(sport: string): 'NBA' | 'NHL' | 'NFL' | 'MLB' {
  const upper = sport.toUpperCase().trim();
  
  if (upper.includes('NBA') || upper.includes('BASKETBALL')) return 'NBA';
  if (upper.includes('NHL') || upper.includes('HOCKEY')) return 'NHL';
  if (upper.includes('NFL') || upper.includes('FOOTBALL')) return 'NFL';
  if (upper.includes('MLB') || upper.includes('BASEBALL')) return 'MLB';
  
  // Default to NBA if unknown
  return 'NBA';
}

/**
 * Normalize stat name - simplified for now
 * In production, you could import the stat normalizer, but for simplicity
 * we'll just clean the stat name
 */
function normalizeStatName(stat: string): string {
  // Clean the stat name
  return stat.trim();
}

/**
 * Generate natural key for deduplication
 */
export function generateNaturalKey(
  platform: string,
  sport: string,
  player: string,
  stat: string,
  line: number,
  gameTime: Date | null,
  team?: string | null,
  opponent?: string | null
): string {
  const parts = [
    platform,
    normalizeSport(sport),
    player.trim().toLowerCase(),
    normalizeStatName(stat).toLowerCase(),
    line.toString(),
    gameTime ? gameTime.toISOString().split('T')[0] : 'no-date',
    team || '',
    opponent || '',
  ];
  return parts.join('|');
}

/**
 * Normalize raw prop to InsertProp format (only safe columns)
 */
export function normalizeToPropRow(
  raw: RawProp,
  platform: 'Underdog' | 'PrizePicks'
): InsertProp {
  const sport = normalizeSport(raw.sport);
  const stat = normalizeStatName(raw.stat);
  
  return {
    sport,
    player: raw.player.trim(),
    team: raw.team || 'TBD',
    opponent: raw.opponent || 'TBD',
    stat,
    line: raw.line.toString(),
    currentLine: raw.line.toString(),
    direction: raw.direction || 'over', // Default to over if direction not available
    period: 'full_game',
    platform,
    fixtureId: null,
    marketId: null,
    gameTime: raw.gameTime || new Date(),
    confidence: 50, // Default confidence
    ev: '0',
    modelProbability: '0.5',
  };
}

