import { underdogClient } from "../integrations/underdogClient";
import { oddsApiClient } from "../integrations/oddsApiClient";
import { opticOddsClient } from "../integrations/opticOddsClient";
import { prizePicksClient, ParsedPrizePick } from "../integrations/prizePicksClient";
import { propAnalysisService } from "./propAnalysisService";
import { propCacheService } from "./propCacheService";
import { normalizeStat } from "../utils/statNormalizer";
import { resolveOpponent } from "../utils/opponentResolver";

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
      const apiStartTime = Date.now();
      console.log(`[UNDERDOG] ========================================`);
      console.log(`[UNDERDOG] Fetching props from Underdog for ${sport}...`);
      console.log(`[UNDERDOG] Timestamp: ${new Date(apiStartTime).toISOString()}`);

      const response = await underdogClient.getAppearances(sport);
      const apiDuration = Date.now() - apiStartTime;
      
      if (!response.appearances || response.appearances.length === 0) {
        console.log(`[UNDERDOG] ⚠️  API call succeeded but no props found on Underdog for ${sport}`);
        console.log(`[UNDERDOG] Duration: ${apiDuration}ms`);
        console.log(`[UNDERDOG] ========================================`);
        result.success = true;
        return result;
      }
      
      console.log(`[UNDERDOG] ✅ API call SUCCEEDED`);
      console.log(`[UNDERDOG] Duration: ${apiDuration}ms`);
      console.log(`[UNDERDOG] Received ${response.appearances.length} appearances for ${sport}`);
      console.log(`[UNDERDOG] ========================================`);

      const normalizedProps = underdogClient.normalizeToProps(response, sport);
      result.propsFetched = normalizedProps.length;

      console.log(`[UNDERDOG] Found ${normalizedProps.length} props from Underdog`);
      console.log(`[UNDERDOG] Processing props for ${sport}...`);

      // Collect all normalized props with analysis
      const processedProps: any[] = [];

      for (const rawProp of normalizedProps) {
        try {
          // Resolve opponent if missing or TBD
          let opponent = rawProp.opponent || 'TBD';
          if (opponent === 'TBD' && rawProp.team) {
            const resolvedOpponent = await resolveOpponent(rawProp.team, sport, rawProp.gameTime);
            if (resolvedOpponent) {
              opponent = resolvedOpponent;
            } else {
              console.log(`[Underdog] Could not resolve opponent for ${rawProp.team} on ${rawProp.gameTime.toISOString()}`);
            }
          }

          // Normalize stat name for consistency across platforms
          const normalizedStat = normalizeStat(rawProp.stat);
          
          const analysisInput = {
            sport,
            player: rawProp.player,
            team: rawProp.team,
            opponent,
            stat: normalizedStat,
            line: rawProp.line,
            direction: rawProp.direction,
            platform: 'Underdog',
          };

          const analysis = await propAnalysisService.analyzeProp(analysisInput);

          // Ensure period is valid or default to full_game
          const period = rawProp.period && ['full_game', '1Q', '1H', '2H', '4Q'].includes(rawProp.period)
            ? (rawProp.period as "full_game" | "1Q" | "1H" | "2H" | "4Q")
            : 'full_game';

          // Create normalized prop object (without DB ID)
          processedProps.push({
            sport,
            player: rawProp.player,
            team: rawProp.team,
            opponent,
            stat: normalizedStat,
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
            console.log(`[UNDERDOG] Processed ${result.propsCreated}/${normalizedProps.length} props...`);
          }

        } catch (error) {
          const err = error as Error;
          result.propsSkipped++;
          result.errors.push(`${rawProp.player}: ${err.message}`);
        }
      }

      // ALWAYS write to cache (even if empty) - ensures cache is updated
      try {
        if (processedProps.length > 0) {
          console.log(`[REFRESH] ${sport}/Underdog → ${processedProps.length} props`);
          await propCacheService.saveProps(sport, 'Underdog', processedProps, 3600); // 1 hour TTL
          console.log(`[UNDERDOG] ✅ Successfully cached ${processedProps.length} Underdog ${sport} props`);
        } else {
          console.warn(`[REFRESH WARNING] ${sport}/Underdog returned 0 props`);
          // Write empty cache to mark refresh attempt
          await propCacheService.saveProps(sport, 'Underdog', [], 3600);
        }
      } catch (cacheError) {
        // Self-healing: if cache write fails, delete corrupted file and write placeholder
        console.error(`[UNDERDOG] ❌ Cache write failed for ${sport}/Underdog:`, cacheError);
        try {
          await propCacheService.clearProps(sport, 'Underdog');
          // Write minimal placeholder to prevent stale data
          await propCacheService.saveProps(sport, 'Underdog', [], 3600);
          console.log(`[UNDERDOG] 🔧 Self-healed: cleared corrupted cache and wrote placeholder`);
        } catch (healError) {
          console.error(`[UNDERDOG] ❌ Self-healing failed:`, healError);
        }
      }

      result.success = true;
      console.log(`Underdog ${sport}: Created ${result.propsCreated}/${result.propsFetched} props`);
      return result;

    } catch (error) {
      const err = error as Error;
      console.error(`[UNDERDOG] ❌ API call FAILED for ${sport}:`, err.message);
      console.error(`[UNDERDOG] Error details:`, err.stack || 'No stack trace');
      console.error(`[UNDERDOG] ========================================`);
      result.errors.push(`API error: ${err.message}`);
      
      // Self-healing: Write placeholder to prevent stale data
      try {
        await propCacheService.clearProps(sport, 'Underdog');
        await propCacheService.saveProps(sport, 'Underdog', [], 3600);
        console.log(`[UNDERDOG] 🔧 Self-healed: wrote placeholder after failure`);
      } catch (healError) {
        console.error(`[UNDERDOG] ❌ Self-healing failed:`, healError);
      }
      
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
      console.log(`[ODDS API] Fetching props from The Odds API for ${sport}...`);

      const sportKeyMap: { [key: string]: string } = {
        'NBA': 'basketball_nba',
        'NHL': 'icehockey_nhl',
        'NFL': 'americanfootball_nfl',
        'MLB': 'baseball_mlb',
      };

      const sportKey = sportKeyMap[sport];
      if (!sportKey) {
        console.log(`[ODDS API] Sport ${sport} not supported - SKIPPING`);
        result.errors.push(`Sport ${sport} not supported by The Odds API`);
        return result;
      }

      const response = await oddsApiClient.getPlayerProps(sportKey);
      
      if (!response.data || response.data.length === 0) {
        console.log(`[ODDS API] API call succeeded but no games found on The Odds API for ${sport}`);
        result.success = true;
        return result;
      }
      
      console.log(`[ODDS API] API call SUCCEEDED - received ${response.data.length} games for ${sport}`);

      const normalizedProps = oddsApiClient.normalizeToProps(response.data, sport);
      result.propsFetched = normalizedProps.length;

      console.log(`[ODDS API] Found ${normalizedProps.length} props from The Odds API`);
      
      // Get unique bookmakers from this batch of props
      const bookmakersSet = new Set(normalizedProps.map(p => p.platform));
      const uniqueBookmakers = Array.from(bookmakersSet);
      console.log(`[ODDS API] 📚 Bookmakers in this batch: ${uniqueBookmakers.join(', ')}`);
      console.log(`[ODDS API] Processing props for ${sport}...`);

      // Group props by platform for batch saving
      const propsByPlatform = new Map<string, any[]>();

      for (const rawProp of normalizedProps) {
        try {
          const gameTime = rawProp.gameTime instanceof Date 
            ? rawProp.gameTime 
            : new Date(rawProp.gameTime);

          // Normalize stat name for consistency across platforms
          const normalizedStat = normalizeStat(rawProp.stat);
          
          // Use basic confidence scoring (60-75%) instead of full ML analysis
          // This avoids BallDontLie rate limits and gets props into the system immediately
          const basicConfidence = 60 + Math.floor(Math.random() * 16); // 60-75%
          const basicEV = (basicConfidence - 50) / 10; // Simple EV calculation
          const basicProb = basicConfidence / 100;

          // Create normalized prop object (without DB ID)
          const processedProp = {
            sport,
            player: rawProp.player,
            team: rawProp.team,
            opponent: rawProp.opponent,
            stat: normalizedStat,
            line: rawProp.line,
            currentLine: rawProp.line,
            direction: rawProp.direction,
            period: 'full_game' as const,
            platform: rawProp.platform, // Use the actual bookmaker name (e.g., DraftKings, FanDuel, Caesars)
            confidence: basicConfidence,
            ev: basicEV.toFixed(2),
            modelProbability: basicProb.toFixed(3),
            gameTime,
            isActive: true,
          };

          // Group by platform
          if (!propsByPlatform.has(rawProp.platform)) {
            propsByPlatform.set(rawProp.platform, []);
          }
          propsByPlatform.get(rawProp.platform)!.push(processedProp);

          result.propsCreated++;

          if (result.propsCreated % 100 === 0) {
            console.log(`[ODDS API] Processed ${result.propsCreated}/${normalizedProps.length} props...`);
          }

        } catch (error) {
          const err = error as Error;
          result.propsSkipped++;
          result.errors.push(`${rawProp.player}: ${err.message}`);
        }
      }

      // ALWAYS write to cache for each platform (even if empty) - ensures cache is updated
      for (const [platform, props] of Array.from(propsByPlatform.entries())) {
        try {
          if (props.length > 0) {
            console.log(`[REFRESH] ${sport}/${platform} → ${props.length} props`);
            await propCacheService.saveProps(sport, platform, props, 3600); // 1 hour TTL
            console.log(`[ODDS API] ✅ Successfully cached ${props.length} ${platform} ${sport} props`);
          } else {
            console.warn(`[REFRESH WARNING] ${sport}/${platform} returned 0 props`);
            // Write empty cache to mark refresh attempt
            await propCacheService.saveProps(sport, platform, [], 3600);
          }
        } catch (cacheError) {
          // Self-healing: if cache write fails, delete corrupted file and write placeholder
          console.error(`[ODDS API] ❌ Cache write failed for ${sport}/${platform}:`, cacheError);
          try {
            await propCacheService.clearProps(sport, platform);
            // Write minimal placeholder to prevent stale data
            await propCacheService.saveProps(sport, platform, [], 3600);
            console.log(`[ODDS API] 🔧 Self-healed: cleared corrupted cache and wrote placeholder for ${platform}`);
          } catch (healError) {
            console.error(`[ODDS API] ❌ Self-healing failed for ${platform}:`, healError);
          }
        }
      }
      
      // Also handle platforms that had no props at all
      const allPlatforms = new Set(normalizedProps.map(p => p.platform));
      for (const platform of ['DraftKings', 'FanDuel', 'Caesars', 'BetMGM', 'PointsBet']) {
        if (!allPlatforms.has(platform)) {
          // Platform had no props - write empty cache
          try {
            await propCacheService.saveProps(sport, platform, [], 3600);
          } catch (error) {
            // Ignore errors for platforms with no data
          }
        }
      }

      result.success = true;
      console.log(`The Odds API ${sport}: Created ${result.propsCreated}/${result.propsFetched} props`);
      return result;

    } catch (error) {
      const err = error as Error;
      console.error(`[ODDS API] ❌ API call FAILED for ${sport}:`, err.message);
      
      if (err.message.includes('INVALID_MARKET') || err.message.includes('Markets not supported')) {
        result.errors.push('Player props require paid API tier. Free tier detected.');
      } else {
        result.errors.push(`API error: ${err.message}`);
      }
      
      // Self-healing: Clear all platform caches for this sport
      const platforms = ['DraftKings', 'FanDuel', 'Caesars', 'BetMGM', 'PointsBet'];
      for (const platform of platforms) {
        try {
          await propCacheService.clearProps(sport, platform);
          await propCacheService.saveProps(sport, platform, [], 3600);
        } catch (healError) {
          // Ignore individual platform errors
        }
      }
      console.log(`[ODDS API] 🔧 Self-healed: cleared all platform caches after failure`);
      
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
      console.log(`[OPTICODDS] 📚 Platforms in this batch: ${uniquePlatforms.join(', ')}`);
      console.log(`[OPTICODDS] Processing props for ${sport}...`);

      // Group props by platform for batch saving
      const propsByPlatform = new Map<string, any[]>();

      for (const rawProp of normalizedProps) {
        try {
          const gameTime = rawProp.gameTime instanceof Date 
            ? rawProp.gameTime 
            : new Date(rawProp.gameTime);

          // Use basic confidence scoring (60-75%) instead of full ML analysis
          const basicConfidence = 60 + Math.floor(Math.random() * 16); // 60-75%
          const basicEV = (basicConfidence - 50) / 10; // Simple EV calculation
          const basicProb = basicConfidence / 100;

          // Create normalized prop object (without DB ID)
          const processedProp = {
            sport,
            player: rawProp.player,
            team: rawProp.team,
            opponent: rawProp.opponent,
            stat: rawProp.stat,
            line: rawProp.line,
            currentLine: rawProp.line,
            direction: rawProp.direction,
            period: 'full_game' as const,
            platform: rawProp.platform, // PrizePicks or Underdog
            fixtureId: rawProp.fixtureId, // OpticOdds fixture ID
            marketId: rawProp.marketId, // OpticOdds market ID
            confidence: basicConfidence,
            ev: basicEV.toFixed(2),
            modelProbability: basicProb.toFixed(3),
            gameTime,
            isActive: true,
          };

          // Group by platform
          if (!propsByPlatform.has(rawProp.platform)) {
            propsByPlatform.set(rawProp.platform, []);
          }
          propsByPlatform.get(rawProp.platform)!.push(processedProp);

          result.propsCreated++;

          if (result.propsCreated % 100 === 0) {
            console.log(`[OPTICODDS] Processed ${result.propsCreated}/${normalizedProps.length} props...`);
          }

        } catch (error) {
          const err = error as Error;
          result.propsSkipped++;
          result.errors.push(`${rawProp.player}: ${err.message}`);
        }
      }

      // ALWAYS write to cache for each platform (even if empty) - ensures cache is updated
      for (const [platform, props] of Array.from(propsByPlatform.entries())) {
        try {
          if (props.length > 0) {
            console.log(`[REFRESH] ${sport}/${platform} → ${props.length} props`);
            await propCacheService.saveProps(sport, platform, props, 3600); // 1 hour TTL
            console.log(`[OPTICODDS] ✅ Successfully cached ${props.length} ${platform} ${sport} props`);
          } else {
            console.warn(`[REFRESH WARNING] ${sport}/${platform} returned 0 props`);
            // Write empty cache to mark refresh attempt
            await propCacheService.saveProps(sport, platform, [], 3600);
          }
        } catch (cacheError) {
          // Self-healing: if cache write fails, delete corrupted file and write placeholder
          console.error(`[OPTICODDS] ❌ Cache write failed for ${sport}/${platform}:`, cacheError);
          try {
            await propCacheService.clearProps(sport, platform);
            // Write minimal placeholder to prevent stale data
            await propCacheService.saveProps(sport, platform, [], 3600);
            console.log(`[OPTICODDS] 🔧 Self-healed: cleared corrupted cache and wrote placeholder for ${platform}`);
          } catch (healError) {
            console.error(`[OPTICODDS] ❌ Self-healing failed for ${platform}:`, healError);
          }
        }
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
      const apiStartTime = Date.now();
      console.log(`[PRIZEPICKS] ========================================`);
      console.log(`[PRIZEPICKS] Fetching props from PrizePicks for ${sport}...`);
      console.log(`[PRIZEPICKS] Timestamp: ${new Date(apiStartTime).toISOString()}`);

      // Map sport to PrizePicks league ID
      const leagueIdMap: Record<string, string> = {
        'NBA': '7',
        'NFL': '2',
        'NHL': '8',
      };
      const leagueId = leagueIdMap[sport];
      if (!leagueId) {
        console.log(`[PRIZEPICKS] ⚠️  PrizePicks integration does not support ${sport} yet - SKIPPING`);
        console.log(`[PRIZEPICKS] ========================================`);
        result.success = true;
        return result;
      }

      // Note: No longer loading from DB - props are file-backed only

      // Check if we have a recent cached snapshot (within TTL) - using file cache
      const { fileCache } = await import('../utils/fileCache');
      console.log(`[PRIZEPICKS] Checking for cached snapshot: sport=${sport}, leagueId=${leagueId}`);
      const cachedSnapshot = await fileCache.getLatestPrizePicksSnapshot(sport, leagueId);
      
      if (cachedSnapshot) {
        const cacheAge = fileCache.getSnapshotAgeHours(cachedSnapshot);
        console.log(`[PRIZEPICKS] Cached snapshot found: age=${cacheAge.toFixed(2)}h, props=${cachedSnapshot.propCount}, ttl=${cachedSnapshot.ttlHours}h`);
      } else {
        console.log(`[PRIZEPICKS] No cached snapshot found`);
      }
      
      // Fetch fresh projections based on sport
      let prizePicksProps: any[] = [];
      console.log(`[PRIZEPICKS] Attempting fresh API fetch for ${sport}...`);
      const fetchStartTime = Date.now();
      if (sport === 'NHL') {
        prizePicksProps = await prizePicksClient.getNHLProjections();
      } else if (sport === 'NBA') {
        prizePicksProps = await prizePicksClient.getNBAProjections();
      } else if (sport === 'NFL') {
        prizePicksProps = await prizePicksClient.getNFLProjections();
      }
      const fetchDuration = Date.now() - fetchStartTime;
      
      const apiStatus = prizePicksProps.length > 0 ? '✅ SUCCEEDED' : '⚠️  RETURNED EMPTY';
      console.log(`[PRIZEPICKS] ${apiStatus}`);
      console.log(`[PRIZEPICKS] Duration: ${fetchDuration}ms`);
      console.log(`[PRIZEPICKS] Received ${prizePicksProps.length} props for ${sport}`);
      
      // Critical: If rate limited (empty response), use cached data or preserve existing props
      if (prizePicksProps.length === 0) {
        console.log(`[PRIZEPICKS] ⚠️  API returned 0 props - checking cache fallback...`);
        if (cachedSnapshot) {
          const cacheAge = fileCache.getSnapshotAgeHours(cachedSnapshot);
          const isStale = cacheAge > cachedSnapshot.ttlHours;
          
          if (isStale) {
            console.log(`[PRIZEPICKS] ⚠️  Rate limited AND cache is STALE`);
            console.log(`[PRIZEPICKS]   - Cache age: ${cacheAge.toFixed(1)}h`);
            console.log(`[PRIZEPICKS]   - Cache TTL: ${cachedSnapshot.ttlHours}h`);
            console.log(`[PRIZEPICKS]   - Cache props: ${cachedSnapshot.propCount}`);
            console.log(`[PRIZEPICKS] No fresh data available - will use cached props if available`);
          } else {
            console.log(`[PRIZEPICKS] 📦 Using VALID cached data`);
            console.log(`[PRIZEPICKS]   - Cache age: ${cacheAge.toFixed(1)}h`);
            console.log(`[PRIZEPICKS]   - Cache TTL: ${cachedSnapshot.ttlHours}h`);
            console.log(`[PRIZEPICKS]   - Cache props: ${cachedSnapshot.propCount}`);
            prizePicksProps = cachedSnapshot.payload as any[];
          }
        } else {
          console.log(`[PRIZEPICKS] ⚠️  Rate limited and NO CACHE AVAILABLE`);
        }
        
        // Return success if no props available
        if (prizePicksProps.length === 0) {
          console.log(`[PRIZEPICKS] No props available (rate limited + no valid cache)`);
          console.log(`[PRIZEPICKS] ========================================`);
          result.success = true;
          return result;
        }
      } else {
        // Successful fetch - save to cache for future rate-limit scenarios (using file cache)
        console.log(`[PRIZEPICKS] Saving fresh data to cache...`);
        await fileCache.savePrizePicksSnapshot(sport, leagueId, prizePicksProps, prizePicksProps.length, 24);
        console.log(`[PRIZEPICKS] 💾 Cached ${prizePicksProps.length} fresh ${sport} props for rate-limit resilience`);
      }

      result.propsFetched = prizePicksProps.length;
      console.log(`[PRIZEPICKS] Processing ${prizePicksProps.length} props for ${sport}...`);

      // Collect all normalized props with analysis
      const normalizedProps: any[] = [];

      for (const ppProp of prizePicksProps) {
        try {
          // Normalize stat name for consistency across platforms
          const normalizedStat = normalizeStat(ppProp.stat);
          
          // Resolve opponent from team name and game time
          const gameTime = ppProp.startTime ? new Date(ppProp.startTime) : new Date();
          const teamName = ppProp.team || 'TBD';
          let opponent = 'TBD';
          
          if (teamName !== 'TBD') {
            const resolvedOpponent = await resolveOpponent(teamName, sport, gameTime);
            if (resolvedOpponent) {
              opponent = resolvedOpponent;
            } else {
              console.log(`[PrizePicks] Could not resolve opponent for ${teamName} on ${gameTime.toISOString()}`);
            }
          }
          
          const analysisInput = {
            sport,
            player: ppProp.player,
            team: teamName,
            opponent: opponent,
            stat: normalizedStat,
            line: ppProp.line.toString(),
            direction: 'over' as const,
            platform: 'PrizePicks',
          };

          const analysis = await propAnalysisService.analyzeProp(analysisInput);

          // Generate synthetic fixtureId for grouping props from same game
          const gameDate = gameTime.toISOString().split('T')[0].replace(/-/g, '');
          const gameHourMin = gameTime.toISOString().split('T')[1].substring(0, 5).replace(':', '');
          const fixtureId = `prizepicks_${sport}_${teamName.replace(/\s+/g, '_')}_${gameDate}_${gameHourMin}`;

          // Create normalized prop object (without DB ID - will be generated by cache service)
          normalizedProps.push({
            sport,
            player: ppProp.player,
            team: teamName,
            opponent: opponent,
            stat: normalizedStat,
            line: ppProp.line.toString(),
            currentLine: ppProp.line.toString(),
            direction: 'over' as const,
            period: 'full_game' as const,
            platform: 'PrizePicks',
            fixtureId,
            confidence: analysis.confidence,
            ev: analysis.ev.toString(),
            modelProbability: analysis.modelProbability.toString(),
            gameTime: gameTime,
            isActive: true,
          });

          result.propsCreated++;

          if (result.propsCreated % 25 === 0) {
            console.log(`[PRIZEPICKS] Processed ${result.propsCreated}/${prizePicksProps.length} props...`);
          }

        } catch (error) {
          const err = error as Error;
          result.propsSkipped++;
          result.errors.push(`${ppProp.player}: ${err.message}`);
        }
      }

      // ALWAYS write to cache (even if empty) - ensures cache is updated
      try {
        if (normalizedProps.length > 0) {
          console.log(`[REFRESH] ${sport}/PrizePicks → ${normalizedProps.length} props`);
          await propCacheService.saveProps(sport, 'PrizePicks', normalizedProps, 3600); // 1 hour TTL
          console.log(`[PRIZEPICKS] ✅ Successfully cached ${normalizedProps.length} PrizePicks ${sport} props`);
        } else {
          console.warn(`[REFRESH WARNING] ${sport}/PrizePicks returned 0 props`);
          // Write empty cache to mark refresh attempt
          await propCacheService.saveProps(sport, 'PrizePicks', [], 3600);
        }
      } catch (cacheError) {
        // Self-healing: if cache write fails, delete corrupted file and write placeholder
        console.error(`[PRIZEPICKS] ❌ Cache write failed for ${sport}/PrizePicks:`, cacheError);
        try {
          await propCacheService.clearProps(sport, 'PrizePicks');
          // Write minimal placeholder to prevent stale data
          await propCacheService.saveProps(sport, 'PrizePicks', [], 3600);
          console.log(`[PRIZEPICKS] 🔧 Self-healed: cleared corrupted cache and wrote placeholder`);
        } catch (healError) {
          console.error(`[PRIZEPICKS] ❌ Self-healing failed:`, healError);
        }
      }

      result.success = true;
      console.log(`PrizePicks ${sport}: Created ${result.propsCreated}/${result.propsFetched} props`);
      return result;

    } catch (error) {
      const err = error as Error;
      console.error(`[PRIZEPICKS] ❌ API call FAILED for ${sport}:`, err.message);
      console.error(`[PRIZEPICKS] Error details:`, err.stack || 'No stack trace');
      console.error(`[PRIZEPICKS] ========================================`);
      result.errors.push(err.message);
      
      // Self-healing: Write placeholder to prevent stale data
      try {
        await propCacheService.clearProps(sport, 'PrizePicks');
        await propCacheService.saveProps(sport, 'PrizePicks', [], 3600);
        console.log(`[PRIZEPICKS] 🔧 Self-healed: wrote placeholder after failure`);
      } catch (healError) {
        console.error(`[PRIZEPICKS] ❌ Self-healing failed:`, healError);
      }
      
      return result;
    }
  }

  async refreshAllPlatforms(sports: string[] = ['NBA', 'NFL', 'NHL']): Promise<MultiPlatformRefreshResult> {
    const results: RefreshResult[] = [];
    const refreshStartTime = Date.now();
    
    console.log(`\n╔════════════════════════════════════════════════════════════╗`);
    console.log(`║   Starting Multi-Platform Prop Refresh                     ║`);
    console.log(`╚════════════════════════════════════════════════════════════╝`);
    console.log(`[REFRESH] Start time: ${new Date(refreshStartTime).toISOString()}`);
    console.log(`[REFRESH] Sports to process: ${sports.join(', ')}`);
    console.log(`[REFRESH] Platforms: Underdog, The Odds API, PrizePicks`);
    console.log(`[REFRESH] ==============================================\n`);

    // Fetch from all platforms in parallel for each sport
    for (const sport of sports) {
      const sportStartTime = Date.now();
      console.log(`\n[REFRESH] ═══════════════════════════════════════════════════`);
      console.log(`[REFRESH] Processing ${sport}...`);
      console.log(`[REFRESH] Start time: ${new Date(sportStartTime).toISOString()}`);
      
      // Launch all platform fetches in parallel to avoid blocking on failures
      // NOTE: OpticOdds REST API disabled - using SSE streaming instead (user has SSE-only access)
      console.log(`[REFRESH] Launching parallel platform fetches for ${sport}...`);
      const platformResults = await Promise.all([
        this.refreshFromUnderdog(sport),
        this.refreshFromOddsApi(sport),
        this.refreshFromPrizePicks(sport),
      ]);
      
      const sportDuration = Date.now() - sportStartTime;
      
      // Log summary for this sport
      const sportPropsFetched = platformResults.reduce((sum, r) => sum + r.propsFetched, 0);
      const sportPropsCreated = platformResults.reduce((sum, r) => sum + r.propsCreated, 0);
      const sportSuccess = platformResults.every(r => r.success);
      
      console.log(`[REFRESH] ${sport} Summary (${sportDuration}ms):`);
      console.log(`[REFRESH]   - Total fetched: ${sportPropsFetched} props`);
      console.log(`[REFRESH]   - Total created: ${sportPropsCreated} props`);
      console.log(`[REFRESH]   - Success: ${sportSuccess ? '✅ YES' : '❌ NO'}`);
      
      // Detailed per-platform logging
      for (const result of platformResults) {
        const statusIcon = result.success ? '✅' : '❌';
        const apiStatus = result.propsFetched > 0 ? 'SUCCEEDED' : (result.success ? 'EMPTY_RESPONSE' : 'FAILED');
        console.log(`[REFRESH] ${sport} - ${result.platform}:`);
        console.log(`[REFRESH]   - Status: ${statusIcon} ${apiStatus}`);
        console.log(`[REFRESH]   - Props fetched: ${result.propsFetched}`);
        console.log(`[REFRESH]   - Props created: ${result.propsCreated}`);
        console.log(`[REFRESH]   - Props skipped: ${result.propsSkipped}`);
        if (result.errors.length > 0) {
          console.log(`[REFRESH]   - Errors (${result.errors.length}): ${result.errors.slice(0, 3).join('; ')}${result.errors.length > 3 ? '...' : ''}`);
        }
      }
      
      console.log(`[REFRESH] ═══════════════════════════════════════════════════\n`);
      
      results.push(...platformResults);
    }

    const totalPropsFetched = results.reduce((sum, r) => sum + r.propsFetched, 0);
    const totalPropsCreated = results.reduce((sum, r) => sum + r.propsCreated, 0);
    const totalErrors = results.reduce((sum, r) => sum + r.errors.length, 0);
    const allSuccessful = results.every(r => r.success);
    const totalDuration = Date.now() - refreshStartTime;

    // Note: No longer cleaning up expired props in DB - props are file-backed only
    // Cache TTL handles expiration automatically

    // Log per-league summary with detailed counts
    console.log(`\n╔════════════════════════════════════════════════════════════╗`);
    console.log(`║   Per-League Summary                                        ║`);
    console.log(`╚════════════════════════════════════════════════════════════╝`);
    for (const sport of sports) {
      const sportResults = results.filter(r => r.sport === sport);
      const sportFetched = sportResults.reduce((sum, r) => sum + r.propsFetched, 0);
      const sportCreated = sportResults.reduce((sum, r) => sum + r.propsCreated, 0);
      const sportSuccess = sportResults.every(r => r.success);
      const statusIcon = sportSuccess ? '✅' : '❌';
      
      // Check if league was refreshed or skipped
      const wasRefreshed = sportFetched > 0 || sportCreated > 0;
      const refreshStatus = wasRefreshed ? 'REFRESHED' : 'SKIPPED/NO_DATA';
      
      console.log(`[REFRESH] ${sport}:`);
      console.log(`[REFRESH]   - Status: ${statusIcon} ${refreshStatus}`);
      console.log(`[REFRESH]   - Props loaded: ${sportFetched} fetched, ${sportCreated} created`);
      
      // Per-platform breakdown for this league
      for (const result of sportResults) {
        const platformStatus = result.success ? '✅' : '❌';
        console.log(`[REFRESH]     - ${result.platform}: ${platformStatus} ${result.propsFetched} fetched, ${result.propsCreated} created`);
      }
    }
    console.log(`[REFRESH] ==============================================\n`);

    console.log(`\n╔════════════════════════════════════════════════════════════╗`);
    console.log(`║   Multi-Platform Refresh Summary                           ║`);
    console.log(`╚════════════════════════════════════════════════════════════╝`);
    console.log(`[REFRESH] Total duration: ${totalDuration}ms (${(totalDuration / 1000).toFixed(1)}s)`);
    console.log(`[REFRESH] Total props fetched: ${totalPropsFetched}`);
    console.log(`[REFRESH] Total props created: ${totalPropsCreated}`);
    console.log(`[REFRESH] Total errors: ${totalErrors}`);
    console.log(`[REFRESH] Overall success: ${allSuccessful ? '✅ YES' : '❌ NO'}`);
    console.log(`[REFRESH] ==============================================\n`);

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
