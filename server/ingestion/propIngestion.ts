import { ingestUnderdog } from './ingestUnderdog.js';
import { ingestPrizePicks } from './ingestPrizePicks.js';

interface IngestionResult {
  fetched: number;
  upserted: number;
  updated: number;
  invalid: number;
  errors: string[];
  byPlatform: Record<string, { fetched: number; upserted: number; updated: number }>;
}

/**
 * Ingest props using browser-based scraping (Playwright)
 * Runs separate ingestion jobs for Underdog and PrizePicks
 * NO API calls, NO fallbacks, NO demo data
 */
export async function ingestAllProps(sports: string[] = ['NBA', 'NFL', 'NHL']): Promise<IngestionResult> {
  const result: IngestionResult = {
    fetched: 0,
    upserted: 0,
    updated: 0,
    invalid: 0,
    errors: [],
    byPlatform: {},
  };

  console.log('\n[INGESTION] ========================================');
  console.log('[INGESTION] Starting browser-based prop ingestion');
  console.log(`[INGESTION] Sports: ${sports.join(', ')}`);
  console.log('[INGESTION] Platforms: Underdog, PrizePicks');
  console.log('[INGESTION] ========================================\n');

  // Run Underdog ingestion job
  console.log('[INGESTION] Running Underdog ingestion job...');
  try {
    const underdogResult = await ingestUnderdog();
    
    result.fetched += underdogResult.found;
    result.upserted += underdogResult.inserted;
    result.errors.push(...underdogResult.errors.map(e => `Underdog: ${e}`));
    
    result.byPlatform['Underdog'] = {
      fetched: underdogResult.found,
      upserted: underdogResult.inserted,
      updated: 0, // We delete and re-insert, so no updates
    };

    if (underdogResult.found === 0) {
      console.warn('[INGESTION] ⚠️  Underdog returned 0 props — scraper failed');
    } else {
      console.log(`[INGESTION] ✅ Underdog: ${underdogResult.found} found, ${underdogResult.inserted} inserted`);
    }
  } catch (error) {
    const err = error as Error;
    console.error(`[INGESTION] ❌ Underdog ingestion failed:`, err);
    result.errors.push(`Underdog ingestion failed: ${err.message}`);
  }

  // Run PrizePicks ingestion job
  console.log('\n[INGESTION] Running PrizePicks ingestion job...');
  try {
    const prizePicksResult = await ingestPrizePicks();
    
    result.fetched += prizePicksResult.found;
    result.upserted += prizePicksResult.inserted;
    result.errors.push(...prizePicksResult.errors.map(e => `PrizePicks: ${e}`));
    
    result.byPlatform['PrizePicks'] = {
      fetched: prizePicksResult.found,
      upserted: prizePicksResult.inserted,
      updated: 0, // We delete and re-insert, so no updates
    };

    if (prizePicksResult.found === 0) {
      console.warn('[INGESTION] ⚠️  PrizePicks returned 0 props — scraper failed');
    } else {
      console.log(`[INGESTION] ✅ PrizePicks: ${prizePicksResult.found} found, ${prizePicksResult.inserted} inserted`);
    }
  } catch (error) {
    const err = error as Error;
    console.error(`[INGESTION] ❌ PrizePicks ingestion failed:`, err);
    result.errors.push(`PrizePicks ingestion failed: ${err.message}`);
  }

  // Final summary
  console.log('\n[INGESTION] ========================================');
  console.log('[INGESTION] Ingestion Summary:');
  console.log(`[INGESTION]   - Total props scraped: ${result.fetched}`);
  console.log(`[INGESTION]   - Total props inserted: ${result.upserted}`);
  console.log(`[INGESTION]   - Total errors: ${result.errors.length}`);
  
  for (const [platform, stats] of Object.entries(result.byPlatform)) {
    console.log(`[INGESTION]   - ${platform}: ${stats.fetched} scraped, ${stats.upserted} inserted`);
  }
  
  if (result.errors.length > 0 && result.errors.length <= 10) {
    console.log(`[INGESTION]   - Errors:`);
    result.errors.forEach(err => console.log(`[INGESTION]     - ${err}`));
  } else if (result.errors.length > 10) {
    console.log(`[INGESTION]   - Errors (showing first 5):`);
    result.errors.slice(0, 5).forEach(err => console.log(`[INGESTION]     - ${err}`));
    console.log(`[INGESTION]     - ... and ${result.errors.length - 5} more`);
  }
  
  console.log('[INGESTION] ========================================\n');

  if (result.fetched === 0) {
    console.warn('[INGESTION] ⚠️  WARNING: No props were scraped from any platform');
    console.warn('[INGESTION] This may indicate:');
    console.warn('[INGESTION]   - Scrapers failed to find prop cards');
    console.warn('[INGESTION]   - Selectors need to be updated');
    console.warn('[INGESTION]   - Authentication issues');
    console.warn('[INGESTION]   - Sites changed their DOM structure');
  }

  if (result.upserted === 0 && result.fetched > 0) {
    console.warn('[INGESTION] ⚠️  WARNING: Props were scraped but none were inserted');
    console.warn('[INGESTION] This may indicate normalization or database errors');
  }

  return result;
}
