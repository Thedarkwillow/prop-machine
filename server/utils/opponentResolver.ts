/**
 * Opponent Resolution Utility
 * 
 * Resolves opponent team names from team name and game time using ESPN scoreboard API.
 * This is used when data sources (like PrizePicks) don't provide opponent information.
 */

import { scoreboardClient } from "../integrations/scoreboardClient";

/**
 * Normalize team name for matching (handles abbreviations and variations)
 */
function normalizeTeamName(teamName: string): string {
  if (!teamName) return "";
  
  // Convert to lowercase and remove common suffixes
  let normalized = teamName
    .toLowerCase()
    .trim()
    .replace(/\s+/g, " ")
    .replace(/\b(golden knights|knights)\b/gi, "")
    .replace(/\b(raiders|warriors|lakers|clippers|kings|suns|mavericks|nuggets|pelicans|thunder|jazz|blazers|rockets|spurs|grizzlies|timberwolves|hornets|heat|celtics|nets|knicks|76ers|raptors|bulls|cavaliers|pistons|pacers|bucks|hawks|magic|wizards|panthers|bengals|browns|broncos|texans|colts|jaguars|chiefs|chargers|rams|dolphins|vikings|patriots|saints|giants|jets|eagles|steelers|49ers|seahawks|buccaneers|titans|commanders|bruins|sabres|hurricanes|blackhawks|avalanche|blue jackets|stars|red wings|oilers|panthers|ducks|kings|wild|predators|devils|islanders|rangers|senators|flyers|penguins|sharks|blues|lightning|maple leafs|canucks|golden knights|capitals|jets)\b/gi, "")
    .trim();
  
  // Handle common abbreviations
  const abbreviationMap: Record<string, string> = {
    "vgk": "vegas",
    "vgk": "vegas golden knights",
    "nyr": "new york rangers",
    "nyi": "new york islanders",
    "njd": "new jersey devils",
    "phi": "philadelphia flyers",
    "pit": "pittsburgh penguins",
    "wsh": "washington capitals",
    "car": "carolina hurricanes",
    "fla": "florida panthers",
    "tbl": "tampa bay lightning",
    "tor": "toronto maple leafs",
    "bos": "boston bruins",
    "buf": "buffalo sabres",
    "mtl": "montreal canadiens",
    "ott": "ottawa senators",
    "det": "detroit red wings",
    "cbj": "columbus blue jackets",
    "chi": "chicago blackhawks",
    "min": "minnesota wild",
    "nsh": "nashville predators",
    "stl": "st. louis blues",
    "wpg": "winnipeg jets",
    "cgy": "calgary flames",
    "edm": "edmonton oilers",
    "van": "vancouver canucks",
    "ana": "anaheim ducks",
    "lak": "los angeles kings",
    "sjs": "san jose sharks",
    "dal": "dallas stars",
    "col": "colorado avalanche",
    "ari": "arizona coyotes",
    "sea": "seattle kraken",
  };
  
  const lower = normalized.toLowerCase();
  if (abbreviationMap[lower]) {
    normalized = abbreviationMap[lower];
  }
  
  return normalized;
}

/**
 * Check if two team names match (handles variations)
 */
function teamNamesMatch(name1: string, name2: string): boolean {
  const norm1 = normalizeTeamName(name1);
  const norm2 = normalizeTeamName(name2);
  
  // Exact match after normalization
  if (norm1 === norm2) return true;
  
  // Check if one contains the other (for partial matches)
  if (norm1 && norm2) {
    if (norm1.includes(norm2) || norm2.includes(norm1)) return true;
  }
  
  // Check original names (case-insensitive)
  const orig1 = name1.toLowerCase().trim();
  const orig2 = name2.toLowerCase().trim();
  if (orig1 === orig2) return true;
  if (orig1.includes(orig2) || orig2.includes(orig1)) return true;
  
  return false;
}

/**
 * Resolve opponent team name from team name and game time
 * @param teamName - The team name (e.g., "VGK", "Vegas Golden Knights")
 * @param sport - The sport (NBA, NHL, NFL)
 * @param gameTime - The game time
 * @returns The opponent team name, or null if not found
 */
export async function resolveOpponent(
  teamName: string,
  sport: string,
  gameTime: Date
): Promise<string | null> {
  if (!teamName || !sport || !gameTime) {
    return null;
  }

  try {
    // Fetch games for the date of the game
    const games = await scoreboardClient.getScoresBySport(sport, gameTime);
    
    if (!games || games.length === 0) {
      console.log(`[OpponentResolver] No games found for ${sport} on ${gameTime.toISOString()}`);
      return null;
    }

    // Find the game where the team is playing
    for (const game of games) {
      const isHomeTeam = teamNamesMatch(teamName, game.homeTeam);
      const isAwayTeam = teamNamesMatch(teamName, game.awayTeam);
      
      if (isHomeTeam) {
        console.log(`[OpponentResolver] Found opponent for ${teamName}: ${game.awayTeam} (home team)`);
        return game.awayTeam;
      }
      
      if (isAwayTeam) {
        console.log(`[OpponentResolver] Found opponent for ${teamName}: ${game.homeTeam} (away team)`);
        return game.homeTeam;
      }
    }
    
    console.log(`[OpponentResolver] Could not find game for team ${teamName} on ${gameTime.toISOString()}`);
    return null;
  } catch (error) {
    console.error(`[OpponentResolver] Error resolving opponent for ${teamName}:`, error);
    return null;
  }
}

/**
 * Batch resolve opponents for multiple props
 * @param props - Array of props with team, sport, and gameTime
 * @returns Map of team+sport+gameTime -> opponent
 */
export async function batchResolveOpponents(
  props: Array<{ team: string; sport: string; gameTime: Date }>
): Promise<Map<string, string | null>> {
  const result = new Map<string, string | null>();
  
  // Group by date to minimize API calls
  const dateGroups = new Map<string, Array<{ team: string; sport: string; gameTime: Date; index: number }>>();
  
  props.forEach((prop, index) => {
    const dateKey = prop.gameTime.toISOString().split('T')[0];
    if (!dateGroups.has(dateKey)) {
      dateGroups.set(dateKey, []);
    }
    dateGroups.get(dateKey)!.push({ ...prop, index });
  });
  
  // Resolve opponents for each date group
  for (const [dateKey, groupProps] of dateGroups) {
    // Get unique sport for this date (assuming all props on same date are same sport)
    const sport = groupProps[0]?.sport;
    if (!sport) continue;
    
    // Fetch games once per date
    const games = await scoreboardClient.getScoresBySport(sport, groupProps[0].gameTime);
    
    // Match each prop to its opponent
    for (const prop of groupProps) {
      const key = `${prop.team}_${prop.sport}_${prop.gameTime.toISOString()}`;
      
      if (games && games.length > 0) {
        for (const game of games) {
          const isHomeTeam = teamNamesMatch(prop.team, game.homeTeam);
          const isAwayTeam = teamNamesMatch(prop.team, game.awayTeam);
          
          if (isHomeTeam) {
            result.set(key, game.awayTeam);
            break;
          }
          
          if (isAwayTeam) {
            result.set(key, game.homeTeam);
            break;
          }
        }
      }
      
      // If not found, set to null
      if (!result.has(key)) {
        result.set(key, null);
      }
    }
  }
  
  return result;
}

