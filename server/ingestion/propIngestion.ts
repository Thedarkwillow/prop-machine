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

  return {
    sport: normalized.sport,
    player: normalized.playerName,
    team: normalized.team || 'TBD',
    opponent: normalized.opponent || 'TBD',
    stat: normalized.statType,
    line: normalized.line.toString(),
    currentLine: normalized.line.toString(),
    direction: 'over' as const, // PrizePicks/Underdog typically only have over props
    period: 'full_game' as const,
    platform: normalized.platform,
    externalId: normalized.externalId,
    gameTime: normalized.gameTime || new Date(),
    confidence,
    ev,
    modelProbability,
    isActive: normalized.isActive,
    raw: normalized.raw,
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

  console.log('[INGEST] Starting prop ingestion for sports:', sports);

  // Fetch from both providers
  const allNormalized: NormalizedProp[] = [];

  for (const sport of sports) {
    // PrizePicks
    try {
      console.log(`[INGEST] Fetching PrizePicks props for ${sport}...`);
      const prizePicksProps = await prizePicksProvider.fetchProps(sport);
      allNormalized.push(...prizePicksProps);
      
      if (!result.byPlatform['PrizePicks']) {
        result.byPlatform['PrizePicks'] = { fetched: 0, upserted: 0, updated: 0 };
      }
      result.byPlatform['PrizePicks'].fetched += prizePicksProps.length;
    } catch (error) {
      const err = error as Error;
      result.errors.push(`PrizePicks ${sport}: ${err.message}`);
      console.error(`[INGEST] PrizePicks ${sport} error:`, err);
    }

    // Underdog
    try {
      console.log(`[INGEST] Fetching Underdog props for ${sport}...`);
      const underdogProps = await underdogProvider.fetchProps(sport);
      allNormalized.push(...underdogProps);
      
      if (!result.byPlatform['Underdog']) {
        result.byPlatform['Underdog'] = { fetched: 0, upserted: 0, updated: 0 };
      }
      result.byPlatform['Underdog'].fetched += underdogProps.length;
    } catch (error) {
      const err = error as Error;
      result.errors.push(`Underdog ${sport}: ${err.message}`);
      console.error(`[INGEST] Underdog ${sport} error:`, err);
    }
  }

  result.fetched = allNormalized.length;
  console.log(`[INGEST] Total normalized props: ${result.fetched}`);

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
        const upsertResult = await storage.upsertProps(insertProps);
        result.upserted += upsertResult.inserted;
        result.updated += upsertResult.updated;
        
        // Track by platform (approximate)
        const platformCounts = new Map<string, { inserted: number; updated: number }>();
        for (const prop of insertProps) {
          if (!platformCounts.has(prop.platform)) {
            platformCounts.set(prop.platform, { inserted: 0, updated: 0 });
          }
        }
        
        // Distribute results proportionally
        const totalOps = upsertResult.inserted + upsertResult.updated;
        if (totalOps > 0) {
          for (const [platform, counts] of platformCounts.entries()) {
            const platformProps = insertProps.filter(p => p.platform === platform).length;
            const ratio = platformProps / insertProps.length;
            const platformInserted = Math.round(upsertResult.inserted * ratio);
            const platformUpdated = Math.round(upsertResult.updated * ratio);
            
            if (result.byPlatform[platform]) {
              result.byPlatform[platform].upserted += platformInserted;
              result.byPlatform[platform].updated += platformUpdated;
            }
          }
        }
        
        console.log(`[INGEST] Batch ${Math.floor(i / batchSize) + 1}: ${upsertResult.inserted} inserted, ${upsertResult.updated} updated`);
      } catch (error) {
        const err = error as Error;
        console.error(`[INGEST] Batch upsert error:`, err);
        result.errors.push(`Batch ${Math.floor(i / batchSize) + 1}: ${err.message}`);
      }
    }
  }

  console.log('[INGEST] ✅ Ingestion completed:', {
    fetched: result.fetched,
    upserted: result.upserted,
    updated: result.updated,
    invalid: result.invalid,
    byPlatform: result.byPlatform,
  });

  return result;
}

