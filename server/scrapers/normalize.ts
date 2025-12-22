import type { InsertProp } from '@shared/schema.js';

export interface RawProp {
  player: string;
  stat: string;
  line: number;
  direction: 'over' | 'under';
  sport: 'NBA' | 'NFL' | 'NHL' | 'MLB';
  team?: string | null;
  opponent?: string | null;
  gameTime?: Date | null;
}

/**
 * Normalize raw prop to InsertProp format (only safe columns)
 */
export function normalizeToPropRow(
  raw: RawProp,
  platform: 'Underdog' | 'PrizePicks'
): InsertProp {
  return {
    sport: raw.sport,
    player: raw.player.trim(),
    team: raw.team || 'TBD',
    opponent: raw.opponent || 'TBD',
    stat: raw.stat.trim(),
    line: raw.line.toString(),
    currentLine: raw.line.toString(),
    direction: raw.direction,
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
