import { espnPlayerClient } from "../integrations/espnPlayerClient";
import { modelScorer } from "../ml/modelScorer";
import { WeatherService } from "./weatherService";
import type { IStorage } from "../storage";

interface PropAnalysisInput {
  sport: string;
  player: string;
  team: string;
  opponent: string;
  stat: string;
  line: string;
  direction: 'over' | 'under';
  platform: string;
  gameId?: string;
  gameTime?: Date;
}

interface PropAnalysisResult {
  confidence: number;
  ev: number;
  modelProbability: number;
  reasoning: string[];
  sport: string;
  player: string;
  team: string;
  opponent: string;
  stat: string;
  line: string;
  direction: 'over' | 'under';
  platform: string;
}

export class PropAnalysisService {
  private weatherService: WeatherService | null = null;

  constructor(storage?: IStorage) {
    if (storage) {
      this.weatherService = new WeatherService(storage);
    }
  }

  private statMapping: { [key: string]: string } = {
    'Points': 'pts',
    'Rebounds': 'reb',
    'Assists': 'ast',
    'Steals': 'stl',
    'Blocks': 'blk',
    '3-Pointers Made': 'fg3m',
    'PTS': 'pts',
    'REB': 'reb',
    'AST': 'ast',
    'STL': 'stl',
    'BLK': 'blk',
  };

  private extractStatValue(game: any, statKey: string): number {
    const mapping: { [key: string]: string } = {
      'pts': 'pts',
      'reb': 'reb',
      'ast': 'ast',
      'stl': 'stl',
      'blk': 'blk',
      'fg3m': 'fg3m',
    };
    
    const actualKey = mapping[statKey];
    return actualKey ? game[actualKey] : 0;
  }

  async analyzeProp(input: PropAnalysisInput): Promise<PropAnalysisResult> {
    const line = parseFloat(input.line);
    
    if (input.sport !== 'NBA') {
      return this.handleNonNBAProps(input, line);
    }

    try {
      // Use ESPN API for NBA player search (more reliable than BallDontLie)
      const players = await espnPlayerClient.searchNBAPlayers(input.player);
      
      if (!players || players.length === 0) {
        console.log(`[NBA Analysis] Player not found: ${input.player}`);
        return this.fallbackAnalysis(input, line, `Player "${input.player}" not found in database`);
      }

      const player = players[0];
      console.log(`[NBA Analysis] Found player: ${player.fullName} (ID: ${player.id})`);

      // Get season stats from ESPN
      const seasonStats = await espnPlayerClient.getNBAPlayerStats(player.id);

      // Map stat type to ESPN stat field
      const statValue = this.mapNBAStatValue(seasonStats, input.stat);
      
      if (statValue === null) {
        console.log(`[NBA Analysis] Stat type not supported: ${input.stat}`);
        return this.fallbackAnalysis(input, line, `Stat type "${input.stat}" not yet supported`);
      }

      // Use season average as both recent and season (ESPN provides season averages)
      const seasonAverage = statValue;
      const recentAverage = statValue; // ESPN provides season averages, not recent games

      console.log(`[NBA Analysis] Season avg: ${seasonAverage.toFixed(2)}, Line: ${line}`);

      const modelScore = await modelScorer.scoreProp({
        playerName: input.player,
        stat: input.stat,
        line,
        direction: input.direction,
        sport: input.sport,
        recentAverage,
        seasonAverage,
      });

      return {
        confidence: modelScore.confidence,
        ev: modelScore.expectedValue,
        modelProbability: modelScore.modelProbability,
        reasoning: modelScore.reasoning,
        sport: input.sport,
        player: input.player,
        team: input.team,
        opponent: input.opponent,
        stat: input.stat,
        line: input.line,
        direction: input.direction,
        platform: input.platform,
      };

    } catch (error) {
      console.error('[NBA Analysis] Error in prop analysis:', error);
      return this.fallbackAnalysis(input, line, 'API error, using basic analysis');
    }
  }

  private calculateAverage(games: any[], statKey: string): number {
    if (!games || games.length === 0) return 0;
    
    const total = games.reduce((sum, game) => {
      return sum + this.extractStatValue(game, statKey);
    }, 0);
    
    return total / games.length;
  }

  /**
   * Map stat type to ESPN NBA stat value
   * Handles: basic stats, combo stats, advanced stats, and quarter-specific stats
   * Returns null if stat type not supported
   */
  private mapNBAStatValue(stats: any, statType: string): number | null {
    // COMBO STATS - add individual components
    if (statType.includes('+')) {
      const components = statType.split('+').map(s => s.trim());
      let total = 0;
      for (const component of components) {
        const value = this.mapNBAStatValue(stats, component);
        if (value === null) return null; // If any component not supported, fail
        total += value;
      }
      return total;
    }

    // QUARTER/PERIOD SPECIFIC STATS - estimate from full game stats
    if (statType.includes('1st 3 Minutes') || statType.includes('First 3 Minutes')) {
      // Extract base stat (e.g., "Points - 1st 3 Minutes" -> "Points")
      const baseStat = statType.replace(/\s*-\s*(1st|First)\s+3\s+Minutes/i, '').trim();
      const fullGameValue = this.mapNBAStatValue(stats, baseStat);
      if (fullGameValue === null) return null;
      // Estimate: ~6-8% of full game stats happen in first 3 minutes (3/48 = 6.25%)
      return fullGameValue * 0.07;
    }

    if (statType.match(/Quarters With (\d+)\+ Points/i)) {
      // "Quarters With 3+ Points" - estimate based on points per game
      const points = stats.points || 0;
      // Simple heuristic: if player averages 20 PPG, they likely hit 3+ in 3-4 quarters, 5+ in 2-3 quarters
      const match = statType.match(/(\d+)\+/);
      const threshold = match ? parseInt(match[1]) : 3;
      const ppq = points / 4; // Points per quarter
      // Estimate quarters above threshold (capped at 4)
      const estimated = Math.min(4, Math.max(0, (ppq / threshold) * 2.5));
      return estimated;
    }

    // BASIC STATS
    const basicMappings: { [key: string]: string } = {
      'Points': 'points',
      'Rebounds': 'rebounds',
      'Assists': 'assists',
      'Steals': 'steals',
      'Blocks': 'blocks',
      'Blocked Shots': 'blocks',
      'PTS': 'points',
      'REB': 'rebounds',
      'AST': 'assists',
      'STL': 'steals',
      'BLK': 'blocks',
      'Pts': 'points',
      'Rebs': 'rebounds',
      'Asts': 'assists',
    };

    // ADVANCED STATS
    const advancedMappings: { [key: string]: string } = {
      '3-PT Made': 'threePointFieldGoalsMade',
      '3-Pointers Made': 'threePointFieldGoalsMade',
      '3-pt Made': 'threePointFieldGoalsMade',
      '3-PT Attempted': 'threePointFieldGoalsAttempted',
      '3-Pointers Attempted': 'threePointFieldGoalsAttempted',
      '3-pt Attempted': 'threePointFieldGoalsAttempted',
      'FG Made': 'fieldGoalsMade',
      'FG Attempted': 'fieldGoalsAttempted',
      'Field Goals Made': 'fieldGoalsMade',
      'Field Goals Attempted': 'fieldGoalsAttempted',
      'Free Throws Made': 'freeThrowsMade',
      'Free Throws Attempted': 'freeThrowsAttempted',
      'Two Pointers Made': 'twoPointFieldGoalsMade',
      'Two Pointers Attempted': 'twoPointFieldGoalsAttempted',
      'Turnovers': 'turnovers',
      'Personal Fouls': 'personalFouls',
    };

    // FANTASY/COMBO VARIATIONS
    const fantasyMappings: { [key: string]: string } = {
      'Points (combo)': 'points',
      '3-pt Made (combo)': 'threePointFieldGoalsMade',
    };

    // Check all mapping categories
    const allMappings = { ...basicMappings, ...advancedMappings, ...fantasyMappings };
    const espnStatKey = allMappings[statType];
    
    if (!espnStatKey) {
      // Special case: Fantasy Score (approximate using PRA formula)
      if (statType === 'Fantasy Score') {
        const pts = stats.points || 0;
        const reb = stats.rebounds || 0;
        const ast = stats.assists || 0;
        const stl = stats.steals || 0;
        const blk = stats.blocks || 0;
        const to = stats.turnovers || 0;
        // Common fantasy formula: 1 point = 1pt, 1.2 reb, 1.5 ast, 2 stl, 2 blk, -1 to
        return pts + (reb * 1.2) + (ast * 1.5) + (stl * 2) + (blk * 2) - to;
      }
      return null;
    }

    return stats[espnStatKey] || 0;
  }

  private async handleNonNBAProps(input: PropAnalysisInput, line: number): Promise<PropAnalysisResult> {
    // Try to fetch actual player data for NHL and NFL
    if (input.sport === 'NHL') {
      return this.analyzeNHLProp(input, line);
    }
    
    if (input.sport === 'NFL') {
      return this.analyzeNFLProp(input, line);
    }

    // Fallback for other sports (MLB, etc.)
    let baseConfidence = 65;
    const modelProbability = 0.60;
    const platformOdds = 1.9;
    const impliedProbability = 1 / platformOdds;
    let ev = ((modelProbability - impliedProbability) / impliedProbability) * 100;

    const reasoning = [
      `${input.sport} data not yet integrated with live stats`,
      `Using baseline analysis for ${input.stat} ${input.direction} ${line}`,
      `Moderate confidence play, manual research recommended`,
    ];

    if (input.sport === 'NFL' && input.gameId && input.gameTime && this.weatherService) {
      try {
        const weatherDataResult = await this.weatherService.fetchAndStoreWeather(input.gameId, input.team, input.gameTime);
        
        if (weatherDataResult) {
          const weatherData = await this.weatherService.getWeatherForGame(input.gameId);
          
          if (weatherData) {
            const position = this.inferPositionFromStat(input.stat);
            const weatherImpact = this.weatherService.analyzeWeatherImpact(
              weatherData,
              input.stat,
              position
            );

            baseConfidence = Math.max(0, Math.min(100, baseConfidence + Math.round(weatherImpact.overallImpact / 2)));
            
            reasoning.push(...weatherImpact.reasoning);
            
            if (weatherData.isDome) {
              reasoning.push("Indoor stadium - stable playing conditions");
            } else {
              reasoning.push(`Weather conditions factored into confidence score`);
            }
          }
        } else {
          reasoning.push("Weather data unavailable for this game");
        }
      } catch (error) {
        console.error("Error fetching weather data:", error);
        reasoning.push("Weather analysis unavailable");
      }
    }

    return {
      confidence: baseConfidence,
      ev: parseFloat(ev.toFixed(2)),
      modelProbability: parseFloat(modelProbability.toFixed(4)),
      reasoning,
      sport: input.sport,
      player: input.player,
      team: input.team,
      opponent: input.opponent,
      stat: input.stat,
      line: input.line,
      direction: input.direction,
      platform: input.platform,
    };
  }

  private fallbackAnalysis(input: PropAnalysisInput, line: number, reason: string): PropAnalysisResult {
    const baseConfidence = 65;
    const modelProbability = 0.60;
    const platformOdds = 1.9;
    const impliedProbability = 1 / platformOdds;
    const ev = ((modelProbability - impliedProbability) / impliedProbability) * 100;

    const reasoning = [
      reason,
      `Using baseline analysis for ${input.stat} ${input.direction} ${line}`,
      `Moderate confidence, proceed with caution`,
    ];

    return {
      confidence: baseConfidence,
      ev: parseFloat(ev.toFixed(2)),
      modelProbability: parseFloat(modelProbability.toFixed(4)),
      reasoning,
      sport: input.sport,
      player: input.player,
      team: input.team,
      opponent: input.opponent,
      stat: input.stat,
      line: input.line,
      direction: input.direction,
      platform: input.platform,
    };
  }

  private async analyzeNHLProp(input: PropAnalysisInput, line: number): Promise<PropAnalysisResult> {
    try {
      const players = await espnPlayerClient.searchNHLPlayers(input.player);
      
      if (!players || players.length === 0) {
        console.log(`[NHL Analysis] Player not found: ${input.player}`);
        return this.fallbackAnalysis(input, line, `NHL player "${input.player}" not found in database`);
      }

      const player = players[0];
      console.log(`[NHL Analysis] Found player: ${player.fullName} (ID: ${player.id})`);

      const seasonStats = await espnPlayerClient.getNHLPlayerStats(player.id);
      const statValue = this.mapNHLStatValue(seasonStats, input.stat);
      
      if (statValue === null) {
        console.log(`[NHL Analysis] Stat type not supported: ${input.stat}`);
        return this.fallbackAnalysis(input, line, `NHL stat type "${input.stat}" not yet supported`);
      }

      console.log(`[NHL Analysis] Season avg: ${statValue.toFixed(2)}, Line: ${line}`);

      const modelScore = await modelScorer.scoreProp({
        playerName: input.player,
        stat: input.stat,
        line,
        direction: input.direction,
        sport: input.sport,
        recentAverage: statValue,
        seasonAverage: statValue,
      });

      return {
        confidence: modelScore.confidence,
        ev: modelScore.expectedValue,
        modelProbability: modelScore.modelProbability,
        reasoning: modelScore.reasoning,
        sport: input.sport,
        player: input.player,
        team: input.team,
        opponent: input.opponent,
        stat: input.stat,
        line: input.line,
        direction: input.direction,
        platform: input.platform,
      };
    } catch (error) {
      console.error('[NHL Analysis] Error in prop analysis:', error);
      return this.fallbackAnalysis(input, line, 'API error, using basic analysis');
    }
  }

  private async analyzeNFLProp(input: PropAnalysisInput, line: number): Promise<PropAnalysisResult> {
    try {
      const players = await espnPlayerClient.searchNFLPlayers(input.player);
      
      if (!players || players.length === 0) {
        console.log(`[NFL Analysis] Player not found: ${input.player}`);
        return this.fallbackAnalysis(input, line, `NFL player "${input.player}" not found in database`);
      }

      const player = players[0];
      console.log(`[NFL Analysis] Found player: ${player.fullName} (ID: ${player.id})`);

      const seasonStats = await espnPlayerClient.getNFLPlayerStats(player.id);
      const statValue = this.mapNFLStatValue(seasonStats, input.stat);
      
      if (statValue === null) {
        console.log(`[NFL Analysis] Stat type not supported: ${input.stat}`);
        return this.fallbackAnalysis(input, line, `NFL stat type "${input.stat}" not yet supported`);
      }

      console.log(`[NFL Analysis] Season avg: ${statValue.toFixed(2)}, Line: ${line}`);

      const modelScore = await modelScorer.scoreProp({
        playerName: input.player,
        stat: input.stat,
        line,
        direction: input.direction,
        sport: input.sport,
        recentAverage: statValue,
        seasonAverage: statValue,
      });

      return {
        confidence: modelScore.confidence,
        ev: modelScore.expectedValue,
        modelProbability: modelScore.modelProbability,
        reasoning: modelScore.reasoning,
        sport: input.sport,
        player: input.player,
        team: input.team,
        opponent: input.opponent,
        stat: input.stat,
        line: input.line,
        direction: input.direction,
        platform: input.platform,
      };
    } catch (error) {
      console.error('[NFL Analysis] Error in prop analysis:', error);
      return this.fallbackAnalysis(input, line, 'API error, using basic analysis');
    }
  }

  private mapNHLStatValue(stats: any, statType: string): number | null {
    const statMappings: { [key: string]: string } = {
      'Goals': 'goals',
      'Assists': 'assists',
      'Points': 'points',
      'Shots': 'shots',
      'Shots on Goal': 'shots',
      'Plus/Minus': 'plus_minus',
      'Penalty Minutes': 'penalty_minutes',
      'PIM': 'penalty_minutes',
    };

    const espnStatKey = statMappings[statType];
    if (!espnStatKey) {
      return null;
    }

    const value = stats[espnStatKey];
    if (value === undefined || value === null) return 0;
    
    // Convert to per-game average
    const gamesPlayed = stats.gamesPlayed || 1;
    return value / gamesPlayed;
  }

  private mapNFLStatValue(stats: any, statType: string): number | null {
    const statMappings: { [key: string]: string } = {
      'Passing Yards': 'passing_yards',
      'Passing TDs': 'passing_touchdowns',
      'Pass TDs': 'passing_touchdowns',
      'Rushing Yards': 'rushing_yards',
      'Rushing TDs': 'rushing_touchdowns',
      'Rush TDs': 'rushing_touchdowns',
      'Receiving Yards': 'receiving_yards',
      'Receiving TDs': 'receiving_touchdowns',
      'Rec TDs': 'receiving_touchdowns',
      'Receptions': 'receptions',
    };

    const espnStatKey = statMappings[statType];
    if (!espnStatKey) {
      return null;
    }

    const value = stats[espnStatKey];
    if (value === undefined || value === null) return 0;
    
    // Convert to per-game average
    const gamesPlayed = stats.gamesPlayed || 1;
    return value / gamesPlayed;
  }

  private inferPositionFromStat(stat: string): string {
    const lowerStat = stat.toLowerCase();
    
    if (lowerStat.includes('passing') || lowerStat.includes('completions') || lowerStat.includes('attempts')) {
      return 'QB';
    }
    
    if (lowerStat.includes('rushing') || lowerStat.includes('carries')) {
      return 'RB';
    }
    
    if (lowerStat.includes('receiving') || lowerStat.includes('receptions') || lowerStat.includes('targets')) {
      return 'WR';
    }
    
    if (lowerStat.includes('field goal') || lowerStat.includes('extra point')) {
      return 'K';
    }
    
    return 'FLEX';
  }
}

export function createPropAnalysisService(storage?: IStorage): PropAnalysisService {
  return new PropAnalysisService(storage);
}

export const propAnalysisService = new PropAnalysisService();
