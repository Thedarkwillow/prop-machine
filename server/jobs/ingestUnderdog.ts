import { scrapeUnderdogProps } from '../scrapers/underdog.js';
import { normalizeToPropRow, generateNaturalKey } from '../scrapers/normalize.js';
import { db } from '../db.js';
import { props } from '@shared/schema.js';
import { eq, and, sql } from 'drizzle-orm';
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
 * Find existing prop by natural key
 */
async function findExistingProp(naturalKey: string, platform: string): Promise<number | null> {
  // Since we can't easily query by natural key, we'll use a composite query
  // This is a simplified approach - in production you might want to add a natural_key column
  // For now, we'll do upserts based on matching criteria
  return null; // Return null to force insert (we'll handle deduplication differently)
}

/**
 * Ingest Underdog props
 */
export async function ingestUnderdog(): Promise<IngestionResult> {
  const result: IngestionResult = {
    platform: 'Underdog',
    sportCounts: {},
    inserted: 0,
    updated: 0,
    totalNormalized: 0,
    errors: [],
  };

  console.log('\n[INGESTION][UNDERDOG] ========================================');
  console.log('[INGESTION][UNDERDOG] Starting Underdog ingestion');
  console.log('[INGESTION][UNDERDOG] ========================================\n');

  try {
    // Scrape props
    const rawProps = await scrapeUnderdogProps();
    console.log(`[INGESTION][UNDERDOG] Scraped ${rawProps.length} raw props`);

    if (rawProps.length === 0) {
      console.warn('[INGESTION][UNDERDOG] ⚠️  No props scraped');
      return result;
    }

    // Normalize props
    const normalizedProps: InsertProp[] = [];
    const naturalKeys = new Set<string>();

    for (const raw of rawProps) {
      try {
        const normalized = normalizeToPropRow(raw, 'Underdog');
        const naturalKey = generateNaturalKey(
          'Underdog',
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
        console.warn(`[INGESTION][UNDERDOG] Normalization error:`, err);
      }
    }

    result.totalNormalized = normalizedProps.length;
    console.log(`[INGESTION][UNDERDOG] Normalized ${result.totalNormalized} props (after deduplication)`);

    if (normalizedProps.length === 0) {
      console.warn('[INGESTION][UNDERDOG] ⚠️  No props to insert after normalization');
      return result;
    }

    // Delete existing Underdog props
    console.log('[INGESTION][UNDERDOG] Deleting existing Underdog props...');
    await db.delete(props).where(eq(props.platform, 'Underdog'));

    // Insert new props
    console.log(`[INGESTION][UNDERDOG] Inserting ${normalizedProps.length} props...`);
    await db.insert(props).values(normalizedProps);
    result.inserted = normalizedProps.length;

    // Count by sport
    for (const prop of normalizedProps) {
      result.sportCounts[prop.sport] = (result.sportCounts[prop.sport] || 0) + 1;
    }

    // Sanity query
    const totalCount = await db.select({ count: sql<number>`count(*)` }).from(props);
    const underdogCount = await db.select({ count: sql<number>`count(*)` }).from(props).where(eq(props.platform, 'Underdog'));

    console.log(`[INGESTION][UNDERDOG] ✅ Inserted ${result.inserted} props`);
    console.log(`[INGESTION][UNDERDOG] Total props in DB: ${totalCount[0]?.count || 0}`);
    console.log(`[INGESTION][UNDERDOG] Total Underdog props in DB: ${underdogCount[0]?.count || 0}`);
    console.log(`[INGESTION][UNDERDOG] Sport breakdown:`, result.sportCounts);

  } catch (error) {
    const err = error as Error;
    console.error(`[INGESTION][UNDERDOG] ❌ Ingestion failed:`, err);
    result.errors.push(`Ingestion failed: ${err.message}`);
  }

  console.log('[INGESTION][UNDERDOG] ========================================\n');
  return result;
}
