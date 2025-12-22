import { launchBrowser } from '../scrapers/browser.js';
import { scrapePrizePicksProps } from '../scrapers/prizepicks.js';
import { normalizeToPropRow } from '../scrapers/normalize.js';
import { db } from '../db.js';
import { props } from '@shared/schema.js';
import { eq } from 'drizzle-orm';
import type { InsertProp } from '@shared/schema.js';

export interface IngestionResult {
  found: number;
  inserted: number;
  errors: string[];
}

/**
 * Ingest PrizePicks props
 */
export async function ingestPrizePicks(): Promise<IngestionResult> {
  const startTime = Date.now();
  const result: IngestionResult = {
    found: 0,
    inserted: 0,
    errors: [],
  };

  console.log('\n[INGESTION][PRIZEPICKS] ========================================');
  console.log('[INGESTION][PRIZEPICKS] Starting PrizePicks ingestion');
  console.log('[INGESTION][PRIZEPICKS] ========================================\n');

  let browser = null;

  try {
    // Launch browser
    browser = await launchBrowser();

    // Scrape props
    const rawProps = await scrapePrizePicksProps(browser);
    result.found = rawProps.length;

    console.log(`[INGESTION][PRIZEPICKS] Scraped ${result.found} props`);

    if (rawProps.length === 0) {
      console.warn('[INGESTION][PRIZEPICKS] ⚠️  No props found - ingestion skipped');
      return result;
    }

    // Normalize props
    const normalizedProps: InsertProp[] = rawProps.map(raw => normalizeToPropRow(raw, 'PrizePicks'));

    // Delete existing PrizePicks props
    console.log('[INGESTION][PRIZEPICKS] Deleting existing PrizePicks props...');
    await db.delete(props).where(eq(props.platform, 'PrizePicks'));

    // Insert new props
    console.log(`[INGESTION][PRIZEPICKS] Inserting ${normalizedProps.length} props...`);
    await db.insert(props).values(normalizedProps);
    result.inserted = normalizedProps.length;

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log(`[INGESTION][PRIZEPICKS] ✅ Inserted ${result.inserted} props in ${duration}s`);

  } catch (error) {
    const err = error as Error;
    console.error(`[INGESTION][PRIZEPICKS] ❌ Ingestion failed:`, err.message);
    result.errors.push(err.message);
  } finally {
    if (browser) {
      await browser.close();
      console.log('[INGESTION][PRIZEPICKS] Browser closed');
    }
  }

  console.log('[INGESTION][PRIZEPICKS] ========================================\n');
  return result;
}

