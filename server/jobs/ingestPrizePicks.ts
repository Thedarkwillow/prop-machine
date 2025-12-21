import { scrapePrizePicksProps } from '../scrapers/prizepicks.js';
import { normalizeToPropRow, generateNaturalKey } from '../scrapers/normalize.js';
import { db } from '../db.js';
import { props } from '@shared/schema.js';
import { eq, sql } from 'drizzle-orm';
import type { InsertProp } from '@shared/schema.js';

export interface IngestionResult {
  platform: string;
  sportCounts: Record<string, number>;
  inserted: number;
  updated: number;
  totalNormalized: number;
  errors: string[];
}

/**
 * Ingest PrizePicks props
 */
export async function ingestPrizePicks(): Promise<IngestionResult> {
  const result: IngestionResult = {
    platform: 'PrizePicks',
    sportCounts: {},
    inserted: 0,
    updated: 0,
    totalNormalized: 0,
    errors: [],
  };

  console.log('\n[INGESTION][PRIZEPICKS] ========================================');
  console.log('[INGESTION][PRIZEPICKS] Starting PrizePicks ingestion');
  console.log('[INGESTION][PRIZEPICKS] ========================================\n');

  try {
    // Scrape props
    const rawProps = await scrapePrizePicksProps();
    console.log(`[INGESTION][PRIZEPICKS] Scraped ${rawProps.length} raw props`);

    if (rawProps.length === 0) {
      console.warn('[INGESTION][PRIZEPICKS] ⚠️  No props scraped');
      return result;
    }

    // Normalize props
    const normalizedProps: InsertProp[] = [];
    const naturalKeys = new Set<string>();

    for (const raw of rawProps) {
      try {
        const normalized = normalizeToPropRow(raw, 'PrizePicks');
        const naturalKey = generateNaturalKey(
          'PrizePicks',
          normalized.sport,
          normalized.player,
          normalized.stat,
          parseFloat(normalized.line),
          normalized.gameTime || null,
          normalized.team,
          normalized.opponent
        );

        // Deduplicate by natural key
        if (!naturalKeys.has(naturalKey)) {
          naturalKeys.add(naturalKey);
          normalizedProps.push(normalized);
        }
      } catch (error) {
        const err = error as Error;
        result.errors.push(`Normalization error: ${err.message}`);
        console.warn(`[INGESTION][PRIZEPICKS] Normalization error:`, err);
      }
    }

    result.totalNormalized = normalizedProps.length;
    console.log(`[INGESTION][PRIZEPICKS] Normalized ${result.totalNormalized} props (after deduplication)`);

    if (normalizedProps.length === 0) {
      console.warn('[INGESTION][PRIZEPICKS] ⚠️  No props to insert after normalization');
      return result;
    }

    // Delete existing PrizePicks props
    console.log('[INGESTION][PRIZEPICKS] Deleting existing PrizePicks props...');
    await db.delete(props).where(eq(props.platform, 'PrizePicks'));

    // Insert new props
    console.log(`[INGESTION][PRIZEPICKS] Inserting ${normalizedProps.length} props...`);
    await db.insert(props).values(normalizedProps);
    result.inserted = normalizedProps.length;

    // Count by sport
    for (const prop of normalizedProps) {
      result.sportCounts[prop.sport] = (result.sportCounts[prop.sport] || 0) + 1;
    }

    // Sanity query
    const totalCount = await db.select({ count: sql<number>`count(*)` }).from(props);
    const prizepicksCount = await db.select({ count: sql<number>`count(*)` }).from(props).where(eq(props.platform, 'PrizePicks'));

    console.log(`[INGESTION][PRIZEPICKS] ✅ Inserted ${result.inserted} props`);
    console.log(`[INGESTION][PRIZEPICKS] Total props in DB: ${totalCount[0]?.count || 0}`);
    console.log(`[INGESTION][PRIZEPICKS] Total PrizePicks props in DB: ${prizepicksCount[0]?.count || 0}`);
    console.log(`[INGESTION][PRIZEPICKS] Sport breakdown:`, result.sportCounts);

  } catch (error) {
    const err = error as Error;
    console.error(`[INGESTION][PRIZEPICKS] ❌ Ingestion failed:`, err);
    result.errors.push(`Ingestion failed: ${err.message}`);
  }

  console.log('[INGESTION][PRIZEPICKS] ========================================\n');
  return result;
}
