import { prizePicksProvider } from "../providers/prizepicksProvider.js";
import { underdogProvider } from "../providers/underdogProvider.js";
import { storage } from "../storage.js";
import type { NormalizedProp } from "../providers/prizepicksProvider.js";
import { propAnalysisService } from "../services/propAnalysisService.js";

interface IngestionResult {
  fetched: number;
  upserted: number;
  updated: number;
  invalid: number;
  errors: string[];
  byPlatform: Record<string, { fetched: number; upserted: number; updated: number }>;
}

/**
 * Convert normalized prop to InsertProp format for database
 */
async function convertToInsertProp(normalized: NormalizedProp): Promise<any> {
  // Run ML analysis to get confidence scores
  let confidence = 50;
  let ev = "0";
  let modelProbability = "0.5";

  try {
    if (normalized.team && normalized.opponent) {
      const analysis = await propAnalysisService.analyzeProp({
        sport: normalized.sport,
        player: normalized.playerName,
        team: normalized.team,
        opponent: normalized.opponent,
        stat: normalized.statType,
        line: normalized.line.toString(),
        direction: 'over' as const, // Default to over, will be set per prop
        platform: normalized.platform,
      });
      confidence = analysis.confidence;
      ev = analysis.ev.toString();
      modelProbability = analysis.modelProbability.toString();
    }
  } catch (error) {
    console.warn(`[INGEST] ML analysis failed for ${normalized.playerName}:`, error);
  }

  // Determine direction from raw data if available, default to 'over'
  let direction: 'over' | 'under' = 'over';
  if (normalized.raw && typeof normalized.raw === 'object') {
    if ('direction' in normalized.raw && normalized.raw.direction) {
      direction = normalized.raw.direction as 'over' | 'under';
    }
  }

  // Only include columns that exist in actual DB (exclude externalId, updatedAt, isActive, raw)
  return {
    sport: normalized.sport,
    player: normalized.playerName,
    team: normalized.team || 'TBD',
    opponent: normalized.opponent || 'TBD',
    stat: normalized.statType,
    line: normalized.line.toString(),
    currentLine: normalized.line.toString(),
    direction,
    period: 'full_game' as const,
    platform: normalized.platform,
    // Removed: externalId (column doesn't exist)
    fixtureId: null,
    marketId: null,
    gameTime: normalized.gameTime || new Date(),
    confidence,
    ev,
    modelProbability,
    // Removed: isActive (column may not exist)
    // Removed: raw (column may not exist)
  };
}

export async function ingestAllProps(sports: string[] = ['NBA', 'NFL', 'NHL']): Promise<IngestionResult> {
  const result: IngestionResult = {
    fetched: 0,
    upserted: 0,
    updated: 0,
    invalid: 0,
    errors: [],
    byPlatform: {},
  };

  console.log('[INGEST] Starting prop ingestion');
  console.log('[INGEST] Starting prop ingestion for sports:', sports);

  // Fetch from both providers
  const allNormalized: NormalizedProp[] = [];

  for (const sport of sports) {
    // PrizePicks
    try {
      console.log(`[INGEST] Fetching PrizePicks props for ${sport}...`);
      const prizePicksProps = await prizePicksProvider.fetchProps(sport);
      
      // If API returned empty, try cache as fallback
      if (prizePicksProps.length === 0) {
        console.log(`[INGEST] PrizePicks API returned 0 props for ${sport}, checking cache...`);
        try {
          const { propCacheService } = await import("../services/propCacheService.js");
          const cachedProps = await propCacheService.getProps(sport, 'PrizePicks');
          if (Array.isArray(cachedProps) && cachedProps.length > 0) {
            console.log(`[INGEST] Found ${cachedProps.length} cached PrizePicks props for ${sport}, converting to normalized format...`);
            // Convert cached props to NormalizedProp format
            console.log(`[INGEST] Converting ${cachedProps.length} cached PrizePicks props to normalized format...`);
            const normalizedFromCache: NormalizedProp[] = [];
            for (const cp of cachedProps) {
              try {
                normalizedFromCache.push({
                  sport: cp.sport,
                  platform: 'PrizePicks',
                  externalId: `cached_${cp.player}_${cp.stat}_${cp.line}_${cp.gameTime?.toISOString().split('T')[0] || 'unknown'}`,
                  playerName: cp.player,
                  statType: cp.stat,
                  line: typeof cp.line === 'string' ? parseFloat(cp.line) : cp.line,
                  gameTime: cp.gameTime ? new Date(cp.gameTime) : null,
                  opponent: cp.opponent || null,
                  team: cp.team || null,
                  isActive: true,
                  raw: { cached: true, original: cp },
                });
              } catch (err) {
                console.error(`[INGEST] Error converting cached prop:`, err, cp);
              }
            }
            console.log(`[INGEST] Successfully converted ${normalizedFromCache.length} cached props`);
            allNormalized.push(...normalizedFromCache);
            if (!result.byPlatform['PrizePicks']) {
              result.byPlatform['PrizePicks'] = { fetched: 0, upserted: 0, updated: 0 };
            }
            result.byPlatform['PrizePicks'].fetched += normalizedFromCache.length;
            console.log(`[INGEST] Using ${normalizedFromCache.length} cached PrizePicks props for ${sport}`);
          } else {
            console.warn(`[INGEST] No cached PrizePicks props available for ${sport}`);
          }
        } catch (cacheError) {
          console.error(`[INGEST] Error reading PrizePicks cache for ${sport}:`, cacheError);
        }
      } else {
        allNormalized.push(...prizePicksProps);
        if (!result.byPlatform['PrizePicks']) {
          result.byPlatform['PrizePicks'] = { fetched: 0, upserted: 0, updated: 0 };
        }
        result.byPlatform['PrizePicks'].fetched += prizePicksProps.length;
      }
    } catch (error) {
      const err = error as Error;
      result.errors.push(`PrizePicks ${sport}: ${err.message}`);
      console.error(`[INGEST] PrizePicks ${sport} error:`, err);
    }

    // Underdog
    try {
      console.log(`[INGEST] Fetching Underdog props for ${sport}...`);
      const underdogProps = await underdogProvider.fetchProps(sport);
      
      // If API returned empty, try cache as fallback
      if (underdogProps.length === 0) {
        console.log(`[INGEST] Underdog API returned 0 props for ${sport}, checking cache...`);
        try {
          const { propCacheService } = await import("../services/propCacheService.js");
          const cachedProps = await propCacheService.getProps(sport, 'Underdog');
          if (Array.isArray(cachedProps) && cachedProps.length > 0) {
            console.log(`[INGEST] Found ${cachedProps.length} cached Underdog props for ${sport}, converting to normalized format...`);
            // Convert cached props to NormalizedProp format
            console.log(`[INGEST] Converting ${cachedProps.length} cached Underdog props to normalized format...`);
            const normalizedFromCache: NormalizedProp[] = [];
            for (const cp of cachedProps) {
              try {
                normalizedFromCache.push({
                  sport: cp.sport,
                  platform: 'Underdog',
                  externalId: `cached_${cp.player}_${cp.stat}_${cp.line}_${cp.gameTime?.toISOString().split('T')[0] || 'unknown'}`,
                  playerName: cp.player,
                  statType: cp.stat,
                  line: typeof cp.line === 'string' ? parseFloat(cp.line) : cp.line,
                  gameTime: cp.gameTime ? new Date(cp.gameTime) : null,
                  opponent: cp.opponent || null,
                  team: cp.team || null,
                  isActive: true,
                  raw: { cached: true, original: cp, direction: cp.direction },
                });
              } catch (err) {
                console.error(`[INGEST] Error converting cached prop:`, err, cp);
              }
            }
            console.log(`[INGEST] Successfully converted ${normalizedFromCache.length} cached props`);
            allNormalized.push(...normalizedFromCache);
            if (!result.byPlatform['Underdog']) {
              result.byPlatform['Underdog'] = { fetched: 0, upserted: 0, updated: 0 };
            }
            result.byPlatform['Underdog'].fetched += normalizedFromCache.length;
            console.log(`[INGEST] Using ${normalizedFromCache.length} cached Underdog props for ${sport}`);
          } else {
            console.warn(`[INGEST] No cached Underdog props available for ${sport}`);
          }
        } catch (cacheError) {
          console.error(`[INGEST] Error reading Underdog cache for ${sport}:`, cacheError);
        }
      } else {
        allNormalized.push(...underdogProps);
        if (!result.byPlatform['Underdog']) {
          result.byPlatform['Underdog'] = { fetched: 0, upserted: 0, updated: 0 };
        }
        result.byPlatform['Underdog'].fetched += underdogProps.length;
      }
    } catch (error) {
      const err = error as Error;
      result.errors.push(`Underdog ${sport}: ${err.message}`);
      console.error(`[INGEST] Underdog ${sport} error:`, err);
    }
  }

  result.fetched = allNormalized.length;
  console.log(`[INGEST] Total normalized props: ${result.fetched}`);
  
  if (allNormalized.length === 0) {
    console.warn(`[INGEST] ⚠️  WARNING: No props to insert! Reasons could be:`);
    console.warn(`[INGEST]   - APIs returned 0 props (rate limited or quota exceeded)`);
    console.warn(`[INGEST]   - Cache is empty (no previous successful fetches)`);
    console.warn(`[INGEST]   - All providers failed`);
    console.warn(`[INGEST]   - Check logs above for specific API errors`);
  }

  // Upsert to database in batches
  console.log(`[INGEST] Upserting ${allNormalized.length} props to database...`);
  
  const batchSize = 50;
  for (let i = 0; i < allNormalized.length; i += batchSize) {
    const batch = allNormalized.slice(i, i + batchSize);
    const insertProps: any[] = [];
    
    for (const normalized of batch) {
      try {
        const insertProp = await convertToInsertProp(normalized);
        insertProps.push(insertProp);
      } catch (error) {
        result.invalid++;
        const err = error as Error;
        if (result.errors.length < 20) {
          result.errors.push(`${normalized.platform} ${normalized.playerName}: ${err.message}`);
        }
      }
    }
    
        if (insertProps.length > 0) {
      try {
        console.log(`[INGEST] Attempting to upsert batch ${Math.floor(i / batchSize) + 1} with ${insertProps.length} props...`);
        const upsertResult = await storage.upsertProps(insertProps);
        console.log(`[INGEST] Upsert result: ${upsertResult.inserted} inserted, ${upsertResult.updated} updated`);
        
        // Log per sport/platform breakdown
        const platformCounts = new Map<string, { inserted: number; updated: number }>();
        for (const prop of insertProps) {
          const platform = prop.platform || 'Unknown';
          if (!platformCounts.has(platform)) {
            platformCounts.set(platform, { inserted: 0, updated: 0 });
          }
        }
        
        // Distribute results proportionally (approximate)
        const totalOps = upsertResult.inserted + upsertResult.updated;
        if (totalOps > 0 && insertProps.length > 0) {
          const opsPerProp = totalOps / insertProps.length;
          for (const [platform, counts] of Array.from(platformCounts.entries())) {
            const platformProps = insertProps.filter(p => (p.platform || 'Unknown') === platform);
            counts.inserted = Math.round(platformProps.length * (upsertResult.inserted / insertProps.length));
            counts.updated = Math.round(platformProps.length * (upsertResult.updated / insertProps.length));
            
            if (result.byPlatform[platform]) {
              result.byPlatform[platform].upserted += counts.inserted;
              result.byPlatform[platform].updated += counts.updated;
            }
          }
        }
        
        // Log structured ingestion results per batch
        console.log(`[INGEST] Batch ${Math.floor(i / batchSize) + 1}: ${upsertResult.inserted} inserted, ${upsertResult.updated} updated`);
        for (const [platform, counts] of Array.from(platformCounts.entries())) {
          console.log(`[INGEST] ${platform}: ${counts.inserted} inserted, ${counts.updated} updated`);
        }
        
        if (upsertResult.inserted === 0 && upsertResult.updated === 0) {
          console.error("[INGEST] ERROR: No props inserted — ingestion failed for this batch");
          console.error("[INGEST] This could mean:");
          console.error("[INGEST]   - All props already exist in database");
          console.error("[INGEST]   - Database constraint violation");
          console.error("[INGEST]   - Silent failure in upsertProps");
          // Log a sample prop to help debug
          if (insertProps.length > 0) {
            console.error("[INGEST] Sample prop:", JSON.stringify(insertProps[0], null, 2));
          }
        } else {
          console.log(`[INGEST] ✅ Successfully inserted ${upsertResult.inserted} props in batch ${Math.floor(i / batchSize) + 1}`);
        }
        
        result.upserted += upsertResult.inserted;
        result.updated += upsertResult.updated;
      } catch (error) {
        const err = error as Error;
        console.error(`[INGEST] ❌ Batch upsert error:`, err);
        console.error(`[INGEST] Error stack:`, err.stack);
        result.errors.push(`Batch ${Math.floor(i / batchSize) + 1}: ${err.message}`);
      }
    } else {
      console.warn(`[INGEST] Batch ${Math.floor(i / batchSize) + 1} has 0 props to insert (all failed conversion)`);
    }
  }

  // Final summary logging
  console.log(`[INGEST] ✅ Ingestion completed: ${result.fetched} fetched, ${result.upserted} inserted, ${result.updated} updated, ${result.invalid} invalid`);
  console.log(`[INGEST] Completed — rows inserted: ${result.upserted}`);
  
  // Log per-platform summary
  for (const [platform, stats] of Object.entries(result.byPlatform)) {
    console.log(`[INGEST] ${platform}: ${stats.fetched} fetched, ${stats.upserted} inserted, ${stats.updated} updated`);
  }
  
  // Warn if no props were inserted
  if (result.upserted === 0 && result.updated === 0) {
    console.warn(`[INGEST] ⚠️  WARNING: No props were inserted into database. This may be due to:`);
    console.warn(`[INGEST]   - API rate limits (check logs for 429/401 errors)`);
    console.warn(`[INGEST]   - Empty cache (no previous successful fetches)`);
    console.warn(`[INGEST]   - All props already exist in database`);
  }

  return result;
}



