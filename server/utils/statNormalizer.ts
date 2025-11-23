/**
 * Stat Normalization Utility
 * 
 * Standardizes stat names across different data sources (PrizePicks, The Odds API, OpticOdds, etc.)
 * to ensure consistent filtering and display in the frontend.
 * 
 * Problems this solves:
 * - The Odds API uses: "Shots_on_goal", "Power_play_points" (underscores, lowercase)
 * - PrizePicks uses: "Shots On Goal", "Power Play Points" (spaces, title case)
 * - OpticOdds uses various formats
 * 
 * This leads to duplicate stats in dropdowns and broken filtering.
 */

// Stat name mapping: source format → normalized format
const STAT_MAPPINGS: Record<string, string> = {
  // NHL - Shots
  'shots_on_goal': 'Shots On Goal',
  'sog': 'Shots On Goal',
  'shots on goal': 'Shots On Goal',
  
  // NHL - Power Play
  'power_play_points': 'Power Play Points',
  'power play points': 'Power Play Points',
  'powerplay points': 'Power Play Points',
  
  // NHL - Blocked Shots
  'blocked_shots': 'Blocked Shots',
  'blocked shots': 'Blocked Shots',
  'blocks': 'Blocked Shots',
  
  // NHL - Time On Ice
  'time_on_ice': 'Time On Ice',
  'time on ice': 'Time On Ice',
  'toi': 'Time On Ice',
  
  // NHL - Faceoffs
  'faceoffs_won': 'Faceoffs Won',
  'faceoffs won': 'Faceoffs Won',
  'player faceoffs won': 'Faceoffs Won',
  
  // NHL - Goalie
  'goalie_saves': 'Goalie Saves',
  'goalie saves': 'Goalie Saves',
  'saves': 'Goalie Saves',
  'goals_allowed': 'Goals Allowed',
  'goals allowed': 'Goals Allowed',
  
  // NBA - 3-Pointers
  'threes': '3-PT Made',
  '3-pointers made': '3-PT Made',
  '3-pt made': '3-PT Made',
  '3pt made': '3-PT Made',
  '3-pt': '3-PT Made',
  '3pm': '3-PT Made',
  '3-pointers attempted': '3-PT Attempted',
  '3-pt attempted': '3-PT Attempted',
  '3pt attempted': '3-PT Attempted',
  '3pa': '3-PT Attempted',
  
  // NBA - Field Goals
  'fg_made': 'FG Made',
  'fg made': 'FG Made',
  'field goals made': 'FG Made',
  'fg_attempted': 'FG Attempted',
  'fg attempted': 'FG Attempted',
  'field goals attempted': 'FG Attempted',
  'fga': 'FG Attempted',
  
  // NBA - Two Pointers
  'two_pointers_made': 'Two Pointers Made',
  'two pointers made': 'Two Pointers Made',
  '2pm': 'Two Pointers Made',
  'two_pointers_attempted': 'Two Pointers Attempted',
  'two pointers attempted': 'Two Pointers Attempted',
  '2pa': 'Two Pointers Attempted',
  
  // NBA - Free Throws
  'free_throws_made': 'Free Throws Made',
  'free throws made': 'Free Throws Made',
  'ftm': 'Free Throws Made',
  'free_throws_attempted': 'Free Throws Attempted',
  'free throws attempted': 'Free Throws Attempted',
  'fta': 'Free Throws Attempted',
  
  // NBA - Rebounds
  'offensive_rebounds': 'Offensive Rebounds',
  'offensive rebounds': 'Offensive Rebounds',
  'oreb': 'Offensive Rebounds',
  'defensive_rebounds': 'Defensive Rebounds',
  'defensive rebounds': 'Defensive Rebounds',
  'dreb': 'Defensive Rebounds',
  'total_rebounds': 'Rebounds',
  'total rebounds': 'Rebounds',
  'reb': 'Rebounds',
  
  // NBA - Combo Stats
  'pts+rebs+asts': 'Pts+Rebs+Asts',
  'pra': 'Pts+Rebs+Asts',
  'points + rebounds + assists': 'Pts+Rebs+Asts',
  'pts+rebs': 'Pts+Rebs',
  'points + rebs': 'Pts+Rebs',
  'pr': 'Pts+Rebs',
  'pts+asts': 'Pts+Asts',
  'pts +asts': 'Pts+Asts',
  'points + assists': 'Pts+Asts',
  'pa': 'Pts+Asts',
  'rebs+asts': 'Rebs+Asts',
  'rebounds +asts': 'Rebs+Asts',
  'rebounds + assists': 'Rebs+Asts',
  'ra': 'Rebs+Asts',
  'blks+stls': 'Blks+Stls',
  'blocks+steals': 'Blks+Stls',
  'blocks + steals': 'Blks+Stls',
  
  // NBA - Other
  'personal_fouls': 'Personal Fouls',
  'personal fouls': 'Personal Fouls',
  'pf': 'Personal Fouls',
  'turnovers': 'Turnovers',
  'to': 'Turnovers',
  'fantasy_score': 'Fantasy Score',
  'fantasy score': 'Fantasy Score',
  'fantasy_points': 'Fantasy Score',
  'fantasy points': 'Fantasy Score',
  'dunks': 'Dunks',
  'nba_blocked_shots': 'Blocked Shots',
  'nba_blocked shots': 'Blocked Shots',
  
  // NBA - Period Specific (1st 3 minutes, 1Q, 1H)
  'rebounds 1st 3 minutes': 'Rebounds 1st 3 Min',
  'rebounds 1st3 minutes': 'Rebounds 1st 3 Min',
  'points 1st 3 minutes': 'Points 1st 3 Min',
  'points 1st3 minutes': 'Points 1st 3 Min',
  'assists 1st3 minutes': 'Assists 1st 3 Min',
  'assists 1st 3 minutes': 'Assists 1st 3 Min',
  
  // NFL - Passing
  'passing_yards': 'Passing Yards',
  'passing yards': 'Passing Yards',
  'pass yds': 'Passing Yards',
  'passing_tds': 'Passing TDs',
  'passing tds': 'Passing TDs',
  'pass tds': 'Passing TDs',
  'completions': 'Completions',
  'completion_percentage': 'Completion %',
  'completion %': 'Completion %',
  'comp %': 'Completion %',
  
  // NFL - Rushing
  'rushing_yards': 'Rushing Yards',
  'rushing yards': 'Rushing Yards',
  'rush yds': 'Rushing Yards',
  'rushing_tds': 'Rushing TDs',
  'rushing tds': 'Rushing TDs',
  'rush tds': 'Rushing TDs',
  'rushing_attempts': 'Rushing Attempts',
  'rushing attempts': 'Rushing Attempts',
  'rush att': 'Rushing Attempts',
  
  // NFL - Receiving
  'receiving_yards': 'Receiving Yards',
  'receiving yards': 'Receiving Yards',
  'rec yds': 'Receiving Yards',
  'receiving_tds': 'Receiving TDs',
  'receiving tds': 'Receiving TDs',
  'rec tds': 'Receiving TDs',
  'receptions': 'Receptions',
  'rec': 'Receptions',
  
  // NFL - Combo
  'rush+rec_yds': 'Rush+Rec Yards',
  'rush+rec yards': 'Rush+Rec Yards',
  'rush+receiving yards': 'Rush+Rec Yards',
  'rush + receiving yards': 'Rush+Rec Yards',
  'pass + rush yards': 'Pass+Rush Yards',
  'rush+rec_tds': 'Rush+Rec TDs',
  'rush+rec tds': 'Rush+Rec TDs',
  'rush+receiving tds': 'Rush+Rec TDs',
  'rush + receiving tds': 'Rush+Rec TDs',
  
  // NFL - Kicking
  'kicking_points': 'Kicking Points',
  'kicking points': 'Kicking Points',
  'pat_made': 'PAT Made',
  'pat made': 'PAT Made',
  'nfl_fg_made': 'FGs Made',
  'nfl_fgs made': 'FGs Made',
  'nfl_field goals made': 'FGs Made',
  
  // NFL - Other
  'sacks': 'Sacks',
  'tackles+assists': 'Tackles+Assists',
  'tackles + assists': 'Tackles+Assists',
  'punts': 'Punts',
  'longest_completion': 'Longest Completion',
  'longest completion': 'Longest Completion',
  'longest_rush': 'Longest Rush',
  'longest rush': 'Longest Rush',
  'interceptions': 'Interceptions',
  'int': 'Interceptions',
  
  // NHL - Additional
  'hits': 'Hits',
  'player hits': 'Hits',
  
  // General - Common variations
  'player points': 'Points',
  'player goals': 'Goals',
  'player assists': 'Assists',
  'player rebounds': 'Rebounds',
  'player steals': 'Steals',
  'player blocks': 'Blocked Shots',
  'player shots on goal': 'Shots On Goal',
  'player time on ice': 'Time On Ice',
  'player longest reception': 'Longest Reception',
  'player longest rush': 'Longest Rush',
};

/**
 * Normalize a stat name to a consistent format
 * @param stat - Raw stat name from any data source
 * @returns Normalized stat name in Title Case with proper formatting
 */
export function normalizeStat(stat: string): string {
  if (!stat) return stat;
  
  // Convert to lowercase and trim for comparison
  const lowerStat = stat.toLowerCase().trim();
  
  // Check if we have a direct mapping
  if (STAT_MAPPINGS[lowerStat]) {
    return STAT_MAPPINGS[lowerStat];
  }
  
  // If no direct mapping, apply general normalization rules:
  // 1. Replace underscores with spaces
  // 2. Lowercase the entire string and trim
  // 3. Collapse multiple spaces into single space
  // 4. Convert to title case (capitalize first letter of each word)
  let normalized = stat
    .replace(/_/g, ' ')
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' '); // Collapse multiple spaces
  
  // Title case: capitalize first letter of each word (filter out empty tokens)
  normalized = normalized.split(' ')
    .filter(word => word.length > 0)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
  
  return normalized;
}

/**
 * Batch normalize an array of stat names
 * @param stats - Array of raw stat names
 * @returns Array of normalized stat names (deduplicated)
 */
export function normalizeStats(stats: string[]): string[] {
  const normalized = stats.map(normalizeStat);
  return Array.from(new Set(normalized)); // Remove duplicates
}
