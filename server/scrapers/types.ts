/**
 * Normalized prop input for database insertion
 */
export type PropInput = {
  sport: 'NBA' | 'NHL' | 'NFL' | 'MLB';
  platform: 'Underdog' | 'PrizePicks';
  player: string;
  team: string | null;
  opponent: string | null;
  stat: string;
  line: number;
  currentLine: number;
  direction: 'over' | 'under';
  period: 'full_game';
  gameTime: Date | null;
  confidence: null;
  ev: null;
  modelProbability: null;
};

