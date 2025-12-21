/**
 * Normalized prop format for database insertion
 * All scrapers must return this exact shape
 */
export interface NormalizedProp {
  sport: 'NBA' | 'NHL' | 'NFL' | 'MLB';
  platform: 'Underdog' | 'PrizePicks';
  player: string;
  team: string | null;
  opponent: string | null;
  stat: string;
  line: number;
  direction: 'over' | 'under';
  period: 'game';
  gameTime: Date | null;
  confidence: null;
  ev: null;
}
