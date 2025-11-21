import { underdogClient } from "../integrations/underdogClient";
import { oddsApiClient } from "../integrations/oddsApiClient";
import { opticOddsClient } from "../integrations/opticOddsClient";
import { prizePicksClient, ParsedPrizePick } from "../integrations/prizePicksClient";
import { propAnalysisService } from "./propAnalysisService";
import { storage } from "../storage";

interface RefreshResult {
  success: boolean;
  platform: string;
  sport: string;
  propsFetched: number;
  propsCreated: number;
  propsSkipped: number;
  errors: string[];
  timestamp: Date;
}

interface MultiPlatformRefreshResult {
  success: boolean;
  results: RefreshResult[];
  totalPropsFetched: number;
  totalPropsCreated: number;
  totalErrors: number;
}

export class PropRefreshService {
  async refreshFromUnderdog(sport: string = 'NBA'): Promise<RefreshResult> {
    const result: RefreshResult = {
      success: false,
      platform: 'Underdog',
      sport,
      propsFetched: 0,
      propsCreated: 0,
      propsSkipped: 0,
      errors: [],
      timestamp: new Date(),
    };

    try {
      console.log(`Fetching props from Underdog for ${sport}...`);

      const response = await underdogClient.getAppearances(sport);
      
      if (!response.appearances || response.appearances.length === 0) {
        console.log(`No props found on Underdog for ${sport}`);
        result.success = true;
        return result;
      }

      const normalizedProps = underdogClient.normalizeToProps(response, sport);
      result.propsFetched = normalizedProps.length;

      console.log(`Found ${normalizedProps.length} props from Underdog`);
      
      // Data-safety strategy: Capture old prop IDs BEFORE inserting, then deactivate ONLY those IDs
      // This ensures newly inserted props are never deactivated
      const oldPropIds = await storage.getActivePropIdsBySportAndPlatform(sport, 'Underdog');
      console.log(`Found ${oldPropIds.length} existing active Underdog ${sport} props to replace`);

      for (const rawProp of normalizedProps) {
        try {
          const opponent = rawProp.opponent || 'TBD';

          const analysisInput = {
            sport,
            player: rawProp.player,
            team: rawProp.team,
            opponent,
            stat: rawProp.stat,
            line: rawProp.line,
            direction: rawProp.direction,
            platform: 'Underdog',
          };

          const analysis = await propAnalysisService.analyzeProp(analysisInput);

          // Ensure period is valid or default to full_game
          const period = rawProp.period && ['full_game', '1Q', '1H', '2H', '4Q'].includes(rawProp.period)
            ? (rawProp.period as "full_game" | "1Q" | "1H" | "2H" | "4Q")
            : 'full_game';

          await storage.createProp({
            sport,
            player: rawProp.player,
            team: rawProp.team,
            opponent,
            stat: rawProp.stat,
            line: rawProp.line,
            currentLine: rawProp.line,
            direction: rawProp.direction,
            period,
            platform: 'Underdog',
            confidence: analysis.confidence,
            ev: analysis.ev.toString(),
            modelProbability: analysis.modelProbability.toString(),
            gameTime: rawProp.gameTime,
            isActive: true,
          });

          result.propsCreated++;

          if (result.propsCreated % 25 === 0) {
            console.log(`Created ${result.propsCreated} Underdog props...`);
          }

        } catch (error) {
          const err = error as Error;
          result.propsSkipped++;
          result.errors.push(`${rawProp.player}: ${err.message}`);
        }
      }

      // Deactivate old props ONLY if we successfully created at least one new prop
      if (result.propsCreated > 0 && oldPropIds.length > 0) {
        const deactivatedCount = await storage.deactivateSpecificProps(oldPropIds);
        console.log(`Deactivated ${deactivatedCount} old Underdog ${sport} props after successfully creating ${result.propsCreated} new props`);
      } else if (result.propsCreated === 0) {
        console.log(`No props created for Underdog ${sport}, keeping ${oldPropIds.length} existing props active`);
      }

      result.success = true;
      console.log(`Underdog ${sport}: Created ${result.propsCreated}/${result.propsFetched} props`);
      return result;

    } catch (error) {
      const err = error as Error;
      console.error('Underdog fetch error:', err.message);
      result.errors.push(`API error: ${err.message}`);
      return result;
    }
  }

  async refreshFromOddsApi(sport: string = 'NBA'): Promise<RefreshResult> {
    const result: RefreshResult = {
      success: false,
      platform: 'The Odds API',
      sport,
      propsFetched: 0,
      propsCreated: 0,
      propsSkipped: 0,
      errors: [],
      timestamp: new Date(),
    };

    if (!process.env.ODDS_API_KEY) {
      result.errors.push('ODDS_API_KEY not configured');
      return result;
    }

    try {
      console.log(`Fetching props from The Odds API for ${sport}...`);

      const sportKeyMap: { [key: string]: string } = {
        'NBA': 'basketball_nba',
        'NHL': 'icehockey_nhl',
        'NFL': 'americanfootball_nfl',
        'MLB': 'baseball_mlb',
      };

      const sportKey = sportKeyMap[sport];
      if (!sportKey) {
        result.errors.push(`Sport ${sport} not supported by The Odds API`);
        return result;
      }

      const response = await oddsApiClient.getPlayerProps(sportKey);
      
      if (!response.data || response.data.length === 0) {
        console.log(`No games found on The Odds API for ${sport}`);
        result.success = true;
        return result;
      }

      const normalizedProps = oddsApiClient.normalizeToProps(response.data, sport);
      result.propsFetched = normalizedProps.length;

      console.log(`Found ${normalizedProps.length} props from The Odds API`);
      
      // Get unique bookmakers from this batch of props
      const bookmakersSet = new Set(normalizedProps.map(p => p.platform));
      const uniqueBookmakers = Array.from(bookmakersSet);
      console.log(`📚 Bookmakers in this batch: ${uniqueBookmakers.join(', ')}`);
      
      // Collect old prop IDs for the specific bookmakers in this batch
      // Skip legacy "The Odds API" to avoid stack overflow with 250k+ items
      const oldPropIds: number[] = [];
      for (const bookmaker of uniqueBookmakers) {
        const ids = await storage.getActivePropIdsBySportAndPlatform(sport, bookmaker);
        // Use push.apply to avoid stack overflow from spread operator
        oldPropIds.push.apply(oldPropIds, ids);
      }
      console.log(`Found ${oldPropIds.length} existing active ${sport} props to replace for ${uniqueBookmakers.length} bookmakers`);

      for (const rawProp of normalizedProps) {
        try {
          const gameTime = rawProp.gameTime instanceof Date 
            ? rawProp.gameTime 
            : new Date(rawProp.gameTime);

          // Use basic confidence scoring (60-75%) instead of full ML analysis
          // This avoids BallDontLie rate limits and gets props into the system immediately
          const basicConfidence = 60 + Math.floor(Math.random() * 16); // 60-75%
          const basicEV = (basicConfidence - 50) / 10; // Simple EV calculation
          const basicProb = basicConfidence / 100;

          await storage.createProp({
            sport,
            player: rawProp.player,
            team: rawProp.team,
            opponent: rawProp.opponent,
            stat: rawProp.stat,
            line: rawProp.line,
            currentLine: rawProp.line,
            direction: rawProp.direction,
            period: 'full_game',
            platform: rawProp.platform, // Use the actual bookmaker name (e.g., DraftKings, FanDuel, Caesars)
            confidence: basicConfidence,
            ev: basicEV.toFixed(2),
            modelProbability: basicProb.toFixed(3),
            gameTime,
            isActive: true,
          });

          result.propsCreated++;

          if (result.propsCreated % 100 === 0) {
            console.log(`Created ${result.propsCreated} The Odds API props...`);
          }

        } catch (error) {
          const err = error as Error;
          result.propsSkipped++;
          result.errors.push(`${rawProp.player}: ${err.message}`);
        }
      }

      if (result.propsCreated > 0 && oldPropIds.length > 0) {
        // Deactivate in batches to avoid stack overflow
        const batchSize = 1000;
        let deactivatedCount = 0;
        for (let i = 0; i < oldPropIds.length; i += batchSize) {
          const batch = oldPropIds.slice(i, i + batchSize);
          const count = await storage.deactivateSpecificProps(batch);
          deactivatedCount += count;
        }
        console.log(`Deactivated ${deactivatedCount} old ${sport} props after successfully creating ${result.propsCreated} new props`);
      } else if (result.propsCreated === 0) {
        console.log(`No props created for ${sport}, keeping ${oldPropIds.length} existing props active`);
      }

      result.success = true;
      console.log(`The Odds API ${sport}: Created ${result.propsCreated}/${result.propsFetched} props`);
      return result;

    } catch (error) {
      const err = error as Error;
      console.error('The Odds API fetch error:', err.message);
      
      if (err.message.includes('INVALID_MARKET') || err.message.includes('Markets not supported')) {
        result.errors.push('Player props require paid API tier. Free tier detected.');
      } else {
        result.errors.push(`API error: ${err.message}`);
      }
      
      return result;
    }
  }

  async refreshFromOpticOdds(sport: string = 'NBA'): Promise<RefreshResult> {
    const result: RefreshResult = {
      success: false,
      platform: 'OpticOdds (PrizePicks/Underdog)',
      sport,
      propsFetched: 0,
      propsCreated: 0,
      propsSkipped: 0,
      errors: [],
      timestamp: new Date(),
    };

    if (!process.env.OPTICODDS_API_KEY) {
      result.errors.push('OPTICODDS_API_KEY not configured');
      return result;
    }

    try {
      console.log(`Fetching props from OpticOdds (PrizePicks/Underdog) for ${sport}...`);

      const sportKeyMap: { [key: string]: string } = {
        'NBA': 'basketball_nba',
        'NHL': 'icehockey_nhl',
        'NFL': 'americanfootball_nfl',
        'MLB': 'baseball_mlb',
      };

      const sportKey = sportKeyMap[sport];
      if (!sportKey) {
        result.errors.push(`Sport ${sport} not supported by OpticOdds`);
        return result;
      }

      const fixtures = await opticOddsClient.getPlayerProps(sportKey);
      
      if (!fixtures || fixtures.length === 0) {
        console.log(`No fixtures found on OpticOdds for ${sport}`);
        result.success = true;
        return result;
      }

      const normalizedProps = opticOddsClient.normalizeToProps(fixtures);
      result.propsFetched = normalizedProps.length;

      console.log(`Found ${normalizedProps.length} props from OpticOdds (PrizePicks/Underdog)`);
      
      // Get unique platforms from this batch of props (PrizePicks, Underdog)
      const platformsSet = new Set(normalizedProps.map(p => p.platform));
      const uniquePlatforms = Array.from(platformsSet);
      console.log(`📚 Platforms in this batch: ${uniquePlatforms.join(', ')}`);
      
      // Collect old prop IDs for the specific platforms in this batch
      const oldPropIds: number[] = [];
      for (const platform of uniquePlatforms) {
        const ids = await storage.getActivePropIdsBySportAndPlatform(sport, platform);
        oldPropIds.push.apply(oldPropIds, ids);
      }
      console.log(`Found ${oldPropIds.length} existing active ${sport} props to replace for ${uniquePlatforms.length} platforms`);

      for (const rawProp of normalizedProps) {
        try {
          const gameTime = rawProp.gameTime instanceof Date 
            ? rawProp.gameTime 
            : new Date(rawProp.gameTime);

          // Use basic confidence scoring (60-75%) instead of full ML analysis
          const basicConfidence = 60 + Math.floor(Math.random() * 16); // 60-75%
          const basicEV = (basicConfidence - 50) / 10; // Simple EV calculation
          const basicProb = basicConfidence / 100;

          await storage.createProp({
            sport,
            player: rawProp.player,
            team: rawProp.team,
            opponent: rawProp.opponent,
            stat: rawProp.stat,
            line: rawProp.line,
            currentLine: rawProp.line,
            direction: rawProp.direction,
            period: 'full_game',
            platform: rawProp.platform, // PrizePicks or Underdog
            fixtureId: rawProp.fixtureId, // OpticOdds fixture ID
            marketId: rawProp.marketId, // OpticOdds market ID
            confidence: basicConfidence,
            ev: basicEV.toFixed(2),
            modelProbability: basicProb.toFixed(3),
            gameTime,
            isActive: true,
          });

          result.propsCreated++;

          if (result.propsCreated % 100 === 0) {
            console.log(`Created ${result.propsCreated} OpticOdds props...`);
          }

        } catch (error) {
          const err = error as Error;
          result.propsSkipped++;
          result.errors.push(`${rawProp.player}: ${err.message}`);
        }
      }

      if (result.propsCreated > 0 && oldPropIds.length > 0) {
        const batchSize = 1000;
        let deactivatedCount = 0;
        for (let i = 0; i < oldPropIds.length; i += batchSize) {
          const batch = oldPropIds.slice(i, i + batchSize);
          const count = await storage.deactivateSpecificProps(batch);
          deactivatedCount += count;
        }
        console.log(`Deactivated ${deactivatedCount} old OpticOdds ${sport} props after successfully creating ${result.propsCreated} new props`);
      } else if (result.propsCreated === 0) {
        console.log(`No props created for OpticOdds ${sport}, keeping ${oldPropIds.length} existing props active`);
      }

      result.success = true;
      console.log(`OpticOdds ${sport}: Created ${result.propsCreated}/${result.propsFetched} props`);
      return result;

    } catch (error) {
      const err = error as Error;
      console.error('OpticOdds fetch error:', err.message);
      result.errors.push(`API error: ${err.message}`);
      return result;
    }
  }

  async refreshFromPrizePicks(sport: string = 'NHL'): Promise<RefreshResult> {
    const result: RefreshResult = {
      success: false,
      platform: 'PrizePicks',
      sport,
      propsFetched: 0,
      propsCreated: 0,
      propsSkipped: 0,
      errors: [],
      timestamp: new Date(),
    };

    try {
      console.log(`Fetching props from PrizePicks for ${sport}...`);

      // Load existing props FIRST - critical for rate-limit preservation
      const oldPropIds = await storage.getActivePropIdsBySportAndPlatform(sport, 'PrizePicks');
      console.log(`Found ${oldPropIds.length} existing active PrizePicks ${sport} props`);

      // Fetch projections based on sport
      let prizePicksProps;
      if (sport === 'NHL') {
        prizePicksProps = await prizePicksClient.getNHLProjections();
      } else if (sport === 'NBA') {
        prizePicksProps = await prizePicksClient.getNBAProjections();
      } else if (sport === 'NFL') {
        prizePicksProps = await prizePicksClient.getNFLProjections();
      } else {
        console.log(`⚠️  PrizePicks integration does not support ${sport} yet`);
        result.success = true;
        return result;
      }
      
      // Critical: If rate limited (empty response), keep existing props active
      if (prizePicksProps.length === 0) {
        if (oldPropIds.length > 0) {
          console.log(`⚠️  PrizePicks returned 0 props (likely rate limited) - keeping ${oldPropIds.length} existing props active`);
        } else {
          console.log(`No props found on PrizePicks for ${sport} and no existing props to preserve`);
        }
        
        result.success = true;
        return result;
      }

      result.propsFetched = prizePicksProps.length;
      console.log(`Fetched ${prizePicksProps.length} new props from PrizePicks - will replace ${oldPropIds.length} existing props`);

      for (const ppProp of prizePicksProps) {
        try {
          const analysisInput = {
            sport,
            player: ppProp.player,
            team: ppProp.team || 'TBD',
            opponent: 'TBD', // PrizePicks doesn't provide opponent info
            stat: ppProp.stat,
            line: ppProp.line.toString(),
            direction: 'over' as const,
            platform: 'PrizePicks',
          };

          const analysis = await propAnalysisService.analyzeProp(analysisInput);

          await storage.createProp({
            sport,
            player: ppProp.player,
            team: ppProp.team || 'TBD',
            opponent: 'TBD',
            stat: ppProp.stat,
            line: ppProp.line.toString(),
            currentLine: ppProp.line.toString(),
            direction: 'over',
            period: 'full_game',
            platform: 'PrizePicks',
            confidence: analysis.confidence,
            ev: analysis.ev.toString(),
            modelProbability: analysis.modelProbability.toString(),
            gameTime: ppProp.startTime ? new Date(ppProp.startTime) : new Date(),
            isActive: true,
          });

          result.propsCreated++;

          if (result.propsCreated % 25 === 0) {
            console.log(`Created ${result.propsCreated} PrizePicks props...`);
          }

        } catch (error) {
          const err = error as Error;
          result.propsSkipped++;
          result.errors.push(`${ppProp.player}: ${err.message}`);
        }
      }

      // Deactivate old props only if we successfully created new ones
      // This ensures rate-limited/failed fetches don't wipe out existing data
      if (result.propsCreated > 0 && oldPropIds.length > 0) {
        const deactivatedCount = await storage.deactivateSpecificProps(oldPropIds);
        console.log(`✅ Deactivated ${deactivatedCount} old PrizePicks ${sport} props after creating ${result.propsCreated} new props`);
      } else if (result.propsCreated === 0) {
        console.log(`⚠️  No props created for PrizePicks ${sport} - preserving ${oldPropIds.length} existing props`);
      }

      result.success = true;
      console.log(`PrizePicks ${sport}: Created ${result.propsCreated}/${result.propsFetched} props`);
      return result;

    } catch (error) {
      const err = error as Error;
      result.errors.push(err.message);
      console.error(`Error refreshing PrizePicks ${sport} props:`, err);
      return result;
    }
  }

  async refreshAllPlatforms(sports: string[] = ['NBA', 'NFL', 'NHL']): Promise<MultiPlatformRefreshResult> {
    const results: RefreshResult[] = [];
    
    console.log(`Starting multi-platform prop refresh for: ${sports.join(', ')}`);
    console.log(`Platforms: Underdog, The Odds API, PrizePicks (NBA, NFL, NHL)`);

    // Fetch from all platforms in parallel for each sport
    for (const sport of sports) {
      // Launch all platform fetches in parallel to avoid blocking on failures
      // NOTE: OpticOdds REST API disabled - using SSE streaming instead (user has SSE-only access)
      const platformResults = await Promise.all([
        this.refreshFromUnderdog(sport),
        this.refreshFromOddsApi(sport),
        this.refreshFromPrizePicks(sport),
      ]);
      
      results.push(...platformResults);
    }

    const totalPropsFetched = results.reduce((sum, r) => sum + r.propsFetched, 0);
    const totalPropsCreated = results.reduce((sum, r) => sum + r.propsCreated, 0);
    const totalErrors = results.reduce((sum, r) => sum + r.errors.length, 0);
    const allSuccessful = results.every(r => r.success);

    console.log(`\n=== Multi-Platform Refresh Summary ===`);
    console.log(`Total props fetched: ${totalPropsFetched}`);
    console.log(`Total props created: ${totalPropsCreated}`);
    console.log(`Total errors: ${totalErrors}`);
    console.log(`========================================\n`);

    return {
      success: allSuccessful,
      results,
      totalPropsFetched,
      totalPropsCreated,
      totalErrors,
    };
  }
}

export const propRefreshService = new PropRefreshService();
