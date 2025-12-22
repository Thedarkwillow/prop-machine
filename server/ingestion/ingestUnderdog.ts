import { launchBrowser } from '../scrapers/browser.js';
import { scrapeUnderdogProps } from '../scrapers/underdog.js';
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
 * Ingest Underdog props
 */
export async function ingestUnderdog(): Promise<IngestionResult> {
  const startTime = Date.now();
  const result: IngestionResult = {
    found: 0,
    inserted: 0,
    errors: [],
  };

  console.log('\n[INGESTION][UNDERDOG] ========================================');
  console.log('[INGESTION][UNDERDOG] Starting Underdog ingestion');
  console.log('[INGESTION][UNDERDOG] ========================================\n');

  let browser = null;

  try {
    // Launch browser
    browser = await launchBrowser();

    // Scrape props
    const rawProps = await scrapeUnderdogProps(browser);
    result.found = rawProps.length;

    console.log(`[INGESTION][UNDERDOG] Scraped ${result.found} props`);

    if (rawProps.length === 0) {
      console.warn('[INGESTION][UNDERDOG] ⚠️  No props found - ingestion skipped');
      return result;
    }

    // Normalize props
    const normalizedProps: InsertProp[] = rawProps.map(raw => normalizeToPropRow(raw, 'Underdog'));

    // Delete existing Underdog props
    console.log('[INGESTION][UNDERDOG] Deleting existing Underdog props...');
    await db.delete(props).where(eq(props.platform, 'Underdog'));

    // Insert new props
    console.log(`[INGESTION][UNDERDOG] Inserting ${normalizedProps.length} props...`);
    await db.insert(props).values(normalizedProps);
    result.inserted = normalizedProps.length;

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log(`[INGESTION][UNDERDOG] ✅ Inserted ${result.inserted} props in ${duration}s`);

  } catch (error) {
    const err = error as Error;
    console.error(`[INGESTION][UNDERDOG] ❌ Ingestion failed:`, err.message);
    result.errors.push(err.message);
  } finally {
    if (browser) {
      await browser.close();
      console.log('[INGESTION][UNDERDOG] Browser closed');
    }
  }

  console.log('[INGESTION][UNDERDOG] ========================================\n');
  return result;
}

