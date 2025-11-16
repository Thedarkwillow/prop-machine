import { balldontlieClient } from "../integrations/balldontlieClient";
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

  private statMapping: { [key: string]: keyof typeof this.extractStatValue } = {
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
      const playersResponse = await balldontlieClient.searchPlayers(input.player);
      
      if (!playersResponse.data || playersResponse.data.length === 0) {
        console.log(`Player not found: ${input.player}`);
        return this.fallbackAnalysis(input, line, `Player "${input.player}" not found in database`);
      }

      const player = playersResponse.data[0];
      console.log(`Found player: ${player.first_name} ${player.last_name} (ID: ${player.id})`);

      const recentStats = await balldontlieClient.getRecentPlayerStats(player.id, 10);
      const currentSeason = new Date().getMonth() < 6 ? new Date().getFullYear() - 1 : new Date().getFullYear();
      const seasonStats = await balldontlieClient.getPlayerStats(player.id, currentSeason);

      const statKey = this.statMapping[input.stat];
      if (!statKey) {
        console.log(`Stat type not supported: ${input.stat}`);
        return this.fallbackAnalysis(input, line, `Stat type "${input.stat}" not yet supported`);
      }

      const recentAverage = this.calculateAverage(recentStats.data, statKey);
      const seasonAverage = this.calculateAverage(seasonStats.data, statKey);

      console.log(`Recent avg: ${recentAverage.toFixed(2)}, Season avg: ${seasonAverage.toFixed(2)}, Line: ${line}`);

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
      console.error('Error in prop analysis:', error);
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

  private async handleNonNBAProps(input: PropAnalysisInput, line: number): Promise<PropAnalysisResult> {
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
            const weatherImpact = this.weatherService.analyzeWeatherImpact(
              weatherData,
              input.stat,
              'unknown'
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
}

export function createPropAnalysisService(storage?: IStorage): PropAnalysisService {
  return new PropAnalysisService(storage);
}

export const propAnalysisService = new PropAnalysisService();
