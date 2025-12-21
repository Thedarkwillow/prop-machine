import { ingestUnderdog, type IngestionResult } from './ingestUnderdog.js';
import { ingestPrizePicks } from './ingestPrizePicks.js';

/**
 * Ingest props from all platforms
 * Runs scrapers in parallel, isolated so one failure doesn't block the other
 */
export async function ingestAllProps(): Promise<Record<string, IngestionResult>> {
  console.log('\n[INGESTION] ========================================');
  console.log('[INGESTION] Starting ingestion from all platforms');
  console.log('[INGESTION] ========================================\n');

  const results: Record<string, IngestionResult> = {};

  // Run Underdog ingestion (isolated)
  try {
    const underdogResult = await ingestUnderdog();
    results['Underdog'] = underdogResult;
  } catch (error) {
    const err = error as Error;
    console.error('[INGESTION] Underdog ingestion failed:', err);
    results['Underdog'] = {
      platform: 'Underdog',
      sportCounts: {},
      inserted: 0,
      updated: 0,
      totalNormalized: 0,
      errors: [err.message],
    };
  }

  // Run PrizePicks ingestion (isolated)
  try {
    const prizepicksResult = await ingestPrizePicks();
    results['PrizePicks'] = prizepicksResult;
  } catch (error) {
    const err = error as Error;
    console.error('[INGESTION] PrizePicks ingestion failed:', err);
    results['PrizePicks'] = {
      platform: 'PrizePicks',
      sportCounts: {},
      inserted: 0,
      updated: 0,
      totalNormalized: 0,
      errors: [err.message],
    };
  }

  // Summary
  console.log('\n[INGESTION] ========================================');
  console.log('[INGESTION] Summary:');
  for (const [platform, result] of Object.entries(results)) {
    console.log(`[INGESTION] ${platform}:`);
    console.log(`[INGESTION]   - Scraped: ${result.totalNormalized}`);
    console.log(`[INGESTION]   - Inserted: ${result.inserted}`);
    console.log(`[INGESTION]   - Updated: ${result.updated}`);
    console.log(`[INGESTION]   - Sports:`, result.sportCounts);
    if (result.errors.length > 0) {
      console.log(`[INGESTION]   - Errors: ${result.errors.length}`);
      result.errors.slice(0, 3).forEach(err => console.log(`[INGESTION]     - ${err}`));
    }
  }
  console.log('[INGESTION] ========================================\n');

  return results;
}

