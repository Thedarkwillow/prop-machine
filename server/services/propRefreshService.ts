import { prizepicksClient } from "../integrations/prizepicksClient";
import { underdogClient } from "../integrations/underdogClient";
import { oddsApiClient } from "../integrations/oddsApiClient";
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
  async refreshFromPrizePicks(sport: string = 'NBA'): Promise<RefreshResult> {
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

      const response = await prizepicksClient.getProjections(sport);
      
      if (!response.data || response.data.length === 0) {
        console.log(`No props found on PrizePicks for ${sport}`);
        result.success = true;
        return result;
      }

      const normalizedProps = prizepicksClient.normalizeToProps(response, sport);
      result.propsFetched = normalizedProps.length;

      console.log(`Found ${normalizedProps.length} props from PrizePicks`);
      
      // Data-safety strategy: Capture old prop IDs BEFORE inserting, then deactivate ONLY those IDs
      // This ensures newly inserted props are never deactivated
      const oldPropIds = await storage.getActivePropIdsBySportAndPlatform(sport, 'PrizePicks');
      console.log(`Found ${oldPropIds.length} existing active PrizePicks ${sport} props to replace`);

      for (const rawProp of normalizedProps) {
        try {
          // Use TBD for opponent if not provided (PrizePicks doesn't include opponent data)
          const opponent = rawProp.opponent || 'TBD';

          // Analyze the prop with ML model
          const analysisInput = {
            sport,
            player: rawProp.player,
            team: rawProp.team,
            opponent,
            stat: rawProp.stat,
            line: rawProp.line,
            direction: rawProp.direction,
            platform: 'PrizePicks',
          };

          const analysis = await propAnalysisService.analyzeProp(analysisInput);

          // Ensure period is valid or default to full_game
          const period = rawProp.period && ['full_game', '1Q', '1H', '2H', '4Q'].includes(rawProp.period)
            ? (rawProp.period as "full_game" | "1Q" | "1H" | "2H" | "4Q")
            : 'full_game';

          // Create the prop in database
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
            platform: 'PrizePicks',
            confidence: analysis.confidence,
            ev: analysis.ev.toString(),
            modelProbability: analysis.modelProbability.toString(),
            gameTime: rawProp.gameTime,
            isActive: true,
          });

          result.propsCreated++;

          if (result.propsCreated % 25 === 0) {
            console.log(`Created ${result.propsCreated} PrizePicks props...`);
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
        console.log(`Deactivated ${deactivatedCount} old PrizePicks ${sport} props after successfully creating ${result.propsCreated} new props`);
      } else if (result.propsCreated === 0) {
        console.log(`No props created for PrizePicks ${sport}, keeping ${oldPropIds.length} existing props active`);
      }

      result.success = true;
      console.log(`PrizePicks ${sport}: Created ${result.propsCreated}/${result.propsFetched} props`);
      return result;

    } catch (error) {
      const err = error as Error;
      console.error('PrizePicks fetch error:', err.message);
      result.errors.push(`API error: ${err.message}`);
      return result;
    }
  }

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

  async refreshAllPlatforms(sports: string[] = ['NBA', 'NFL', 'NHL']): Promise<MultiPlatformRefreshResult> {
    const results: RefreshResult[] = [];
    
    console.log(`Starting multi-platform prop refresh for: ${sports.join(', ')}`);
    console.log(`Platforms: PrizePicks, Underdog`);

    // Fetch from all platforms for each sport
    for (const sport of sports) {
      const prizepicksResult = await this.refreshFromPrizePicks(sport);
      results.push(prizepicksResult);

      const underdogResult = await this.refreshFromUnderdog(sport);
      results.push(underdogResult);
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
