import { storage } from "../storage.js";
import { propRefreshService } from "./propRefreshService.js";
import type { InsertProp } from "@shared/schema";

interface IngestionResult {
  fetched: number;
  upserted: number;
  invalid: number;
  errors: string[];
  byPlatform: Record<string, { fetched: number; upserted: number }>;
}

/**
 * Upsert a prop into the database using storage.upsertProp
 */
async function upsertPropToDb(prop: InsertProp): Promise<{ inserted: boolean; updated: boolean }> {
  try {
    // Use storage.upsertProp which handles idempotent upserts
    const existingProps = await storage.getAllActiveProps();
    const existing = existingProps.find(p => 
      p.platform === prop.platform &&
      p.sport === prop.sport &&
      p.player === prop.player &&
      p.stat === prop.stat &&
      p.line === prop.line &&
      p.direction === prop.direction
    );

    if (existing) {
      // Update existing prop
      await storage.updateProp(existing.id, {
        currentLine: prop.currentLine ?? null,
        confidence: prop.confidence,
        ev: prop.ev,
        modelProbability: prop.modelProbability,
      });
      return { inserted: false, updated: true };
    } else {
      // Insert new prop
      await storage.createProp(prop);
      return { inserted: true, updated: false };
    }
  } catch (error) {
    throw error;
  }
}

export class PropIngestionService {
  /**
   * Ingest props from PrizePicks and Underdog for specified sports
   */
  async ingestProps(sports: string[] = ['NBA', 'NFL', 'NHL']): Promise<IngestionResult> {
    const result: IngestionResult = {
      fetched: 0,
      upserted: 0,
      invalid: 0,
      errors: [],
      byPlatform: {},
    };

    console.log('[INGEST] Starting prop ingestion for sports:', sports);

    for (const sport of sports) {
      console.log(`[INGEST] Processing ${sport}...`);

      // Fetch from PrizePicks
      try {
        console.log(`[INGEST] Fetching PrizePicks props for ${sport}...`);
        const prizePicksResult = await propRefreshService.refreshFromPrizePicks(sport);
        
        if (!result.byPlatform['PrizePicks']) {
          result.byPlatform['PrizePicks'] = { fetched: 0, upserted: 0 };
        }
        result.byPlatform['PrizePicks'].fetched += prizePicksResult.propsFetched;

        // PrizePicks refresh writes to cache, but we need to also write to DB
        // The refresh service normalizes props but only caches them
        // We'll need to extract from cache or modify refresh to also write to DB
        // For now, we'll rely on the refresh service's cache, and sync cache to DB separately
        console.log(`[INGEST] PrizePicks ${sport}: fetched ${prizePicksResult.propsFetched}, created ${prizePicksResult.propsCreated}`);
      } catch (error) {
        const err = error as Error;
        result.errors.push(`PrizePicks ${sport}: ${err.message}`);
        console.error(`[INGEST] PrizePicks ${sport} error:`, err);
      }

      // Fetch from Underdog
      try {
        console.log(`[INGEST] Fetching Underdog props for ${sport}...`);
        const underdogResult = await propRefreshService.refreshFromUnderdog(sport);
        
        if (!result.byPlatform['Underdog']) {
          result.byPlatform['Underdog'] = { fetched: 0, upserted: 0 };
        }
        result.byPlatform['Underdog'].fetched += underdogResult.propsFetched;

        console.log(`[INGEST] Underdog ${sport}: fetched ${underdogResult.propsFetched}, created ${underdogResult.propsCreated}`);
      } catch (error) {
        const err = error as Error;
        result.errors.push(`Underdog ${sport}: ${err.message}`);
        console.error(`[INGEST] Underdog ${sport} error:`, err);
      }
    }

    // Sync cache to DB - read from cache and write to DB
    console.log('[INGEST] Syncing cached props to database...');
    const { propCacheService } = await import("./propCacheService.js");
    
    for (const sport of sports) {
      for (const platform of ['PrizePicks', 'Underdog']) {
        try {
          const cachedProps = await propCacheService.getProps(sport, platform);
          if (Array.isArray(cachedProps) && cachedProps.length > 0) {
            console.log(`[INGEST] Syncing ${cachedProps.length} ${platform} ${sport} props to DB...`);
            
            let upserted = 0;
            let updated = 0;
            for (const cachedProp of cachedProps) {
              try {
                const prop: InsertProp = {
                  sport: cachedProp.sport,
                  player: cachedProp.player,
                  team: cachedProp.team,
                  opponent: cachedProp.opponent || 'TBD',
                  stat: cachedProp.stat,
                  line: cachedProp.line,
                  currentLine: cachedProp.currentLine || cachedProp.line,
                  direction: cachedProp.direction,
                  period: cachedProp.period || 'full_game',
                  platform: cachedProp.platform,
                  fixtureId: cachedProp.fixtureId || null,
                  marketId: cachedProp.marketId || null,
                  confidence: cachedProp.confidence,
                  ev: cachedProp.ev,
                  modelProbability: cachedProp.modelProbability,
                  gameTime: cachedProp.gameTime ? new Date(cachedProp.gameTime) : new Date(),
                  isActive: true,
                };

                const { inserted } = await upsertPropToDb(prop);
                if (inserted) {
                  upserted++;
                } else {
                  updated++;
                }
              } catch (error) {
                result.invalid++;
                const err = error as Error;
                if (result.errors.length < 10) {
                  result.errors.push(`${platform} ${sport} ${cachedProp.player}: ${err.message}`);
                }
              }
            }

            result.upserted += upserted;
            if (result.byPlatform[platform]) {
              result.byPlatform[platform].upserted += upserted;
            }
            console.log(`[INGEST] ✅ Synced ${upserted} inserted, ${updated} updated ${platform} ${sport} props to DB`);
          } else {
            console.log(`[INGEST] No cached props found for ${platform} ${sport}`);
          }
        } catch (error) {
          const err = error as Error;
          console.error(`[INGEST] Error syncing ${platform} ${sport}:`, err);
          result.errors.push(`Sync ${platform} ${sport}: ${err.message}`);
        }
      }
    }

    result.fetched = Object.values(result.byPlatform).reduce((sum, p) => sum + p.fetched, 0);

    console.log('[INGEST] ✅ Ingestion completed:', {
      fetched: result.fetched,
      upserted: result.upserted,
      invalid: result.invalid,
      byPlatform: result.byPlatform,
    });

    return result;
  }
}

export const propIngestionService = new PropIngestionService();

