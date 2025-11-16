import { oddsApiClient } from "../integrations/oddsApiClient";
import { propAnalysisService } from "./propAnalysisService";
import { storage } from "../storage";

interface FetchResult {
  success: boolean;
  propsFetched: number;
  propsCreated: number;
  propsSkipped: number;
  errors: string[];
  sport: string;
}

const SPORT_KEY_MAP: { [key: string]: string } = {
  'NBA': 'basketball_nba',
  'NHL': 'icehockey_nhl',
  'NFL': 'americanfootball_nfl',
  'MLB': 'baseball_mlb',
};

const STAT_TYPE_MAP: { [key: string]: string } = {
  'player_points': 'Points',
  'player_rebounds': 'Rebounds',
  'player_assists': 'Assists',
  'player_threes': '3PM',
  'player_blocks': 'Blocks',
  'player_steals': 'Steals',
};

export class PropFetcherService {
  async fetchAndAnalyzeProps(sport: string = 'NBA'): Promise<FetchResult> {
    const result: FetchResult = {
      success: true,
      propsFetched: 0,
      propsCreated: 0,
      propsSkipped: 0,
      errors: [],
      sport,
    };

    if (!process.env.ODDS_API_KEY) {
      result.success = false;
      result.errors.push('ODDS_API_KEY environment variable not set');
      return result;
    }

    try {
      const sportKey = SPORT_KEY_MAP[sport] || SPORT_KEY_MAP['NBA'];
      console.log(`Fetching props for ${sport} (${sportKey})...`);

      const response = await oddsApiClient.getPlayerProps(sportKey);

      if (!response.data || response.data.length === 0) {
        console.log(`No games found for ${sport}`);
        return result;
      }

      console.log(`Found ${response.data.length} games with prop markets`);

      const normalizedProps = oddsApiClient.normalizeToProps(response.data, sport);
      result.propsFetched = normalizedProps.length;

      console.log(`Normalized ${normalizedProps.length} props from API`);

      for (const rawProp of normalizedProps) {
        try {
          const statType = this.mapStatType(rawProp.stat);
          
          if (!statType) {
            result.propsSkipped++;
            continue;
          }

          const analysisInput = {
            sport,
            player: rawProp.player,
            team: rawProp.team,
            opponent: rawProp.opponent,
            stat: statType,
            line: rawProp.line,
            direction: rawProp.direction,
            platform: 'The Odds API',
          };

          const analysis = await propAnalysisService.analyzeProp(analysisInput);

          const gameTime = rawProp.gameTime instanceof Date 
            ? rawProp.gameTime 
            : new Date(rawProp.gameTime);

          await storage.createProp({
            sport,
            player: rawProp.player,
            team: rawProp.team,
            opponent: rawProp.opponent,
            stat: statType,
            line: rawProp.line,
            currentLine: rawProp.line,
            direction: rawProp.direction,
            platform: 'The Odds API',
            confidence: analysis.confidence,
            ev: analysis.ev.toString(),
            modelProbability: analysis.modelProbability.toString(),
            gameTime,
            isActive: true,
          });

          result.propsCreated++;

          if (result.propsCreated % 10 === 0) {
            console.log(`Created ${result.propsCreated} props so far...`);
          }

        } catch (error) {
          const err = error as Error;
          result.propsSkipped++;
          result.errors.push(`Failed to analyze prop for ${rawProp.player}: ${err.message}`);
          
          if (result.errors.length <= 5) {
            console.error(`Error analyzing prop:`, err.message);
          }
        }
      }

      console.log(`
Prop Fetch Summary for ${sport}:
- Props fetched from API: ${result.propsFetched}
- Props created in storage: ${result.propsCreated}
- Props skipped: ${result.propsSkipped}
- Errors: ${result.errors.length}
      `);

      return result;

    } catch (error) {
      const err = error as Error;
      console.error('Error fetching props:', error);
      result.success = false;
      result.errors.push(`API error: ${err.message}`);
      return result;
    }
  }

  private mapStatType(apiStat: string): string | null {
    const normalized = apiStat.toLowerCase();
    
    for (const [apiKey, statType] of Object.entries(STAT_TYPE_MAP)) {
      if (normalized.includes(apiKey.replace('player_', ''))) {
        return statType;
      }
    }

    return STAT_TYPE_MAP[normalized] || null;
  }
}

export const propFetcherService = new PropFetcherService();
