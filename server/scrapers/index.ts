import { scrapeUnderdogProps } from './underdog.scraper.js';
import { db } from '../db.js';
import { props } from '@shared/schema.js';
import { eq } from 'drizzle-orm';
import type { NormalizedProp } from './types.js';
import type { InsertProp } from '@shared/schema.js';

/**
 * Convert NormalizedProp to InsertProp for database
 */
function toInsertProp(normalized: NormalizedProp): InsertProp {
  return {
    sport: normalized.sport,
    player: normalized.player,
    team: normalized.team || 'TBD',
    opponent: normalized.opponent || 'TBD',
    stat: normalized.stat,
    line: normalized.line.toString(),
    currentLine: normalized.line.toString(),
    direction: normalized.direction,
    period: 'full_game', // Convert 'game' to schema enum value
    platform: normalized.platform,
    fixtureId: null,
    marketId: null,
    gameTime: normalized.gameTime || new Date(),
    confidence: normalized.confidence ?? 50, // Default confidence if null
    ev: '0', // EV is null in normalized prop, use default
    modelProbability: '0.5', // Model probability is null in normalized prop, use default
  };
}

interface IngestionResult {
  platform: string;
  scraped: number;
  inserted: number;
  errors: string[];
}

/**
 * Ingest all props from all platforms
 * Runs scrapers sequentially and inserts into database
 */
export async function ingestAllProps(): Promise<Record<string, IngestionResult>> {
  const results: Record<string, IngestionResult> = {};

  console.log('\n[INGESTION] ========================================');
  console.log('[INGESTION] Starting prop ingestion from all platforms');
  console.log('[INGESTION] ========================================\n');

  // Ingest Underdog props
  console.log('[INGESTION] Running Underdog scraper...');
  const underdogResult: IngestionResult = {
    platform: 'Underdog',
    scraped: 0,
    inserted: 0,
    errors: [],
  };

  try {
    const scrapedProps = await scrapeUnderdogProps();
    underdogResult.scraped = scrapedProps.length;
    console.log(`[INGESTION] Underdog scraped ${underdogResult.scraped} props`);

    if (scrapedProps.length > 0) {
      // Delete existing Underdog props
      console.log('[INGESTION] Deleting existing Underdog props...');
      await db.delete(props).where(eq(props.platform, 'Underdog'));

      // Insert new props
      console.log(`[INGESTION] Inserting ${scrapedProps.length} Underdog props...`);
      const insertProps: InsertProp[] = scrapedProps.map(toInsertProp);
      await db.insert(props).values(insertProps);
      underdogResult.inserted = scrapedProps.length;
      console.log(`[INGESTION] ✅ Underdog: ${underdogResult.inserted} props inserted`);
    } else {
      console.warn('[INGESTION] ⚠️  Underdog scraper returned 0 props');
    }
  } catch (error) {
    const err = error as Error;
    console.error('[INGESTION] ❌ Underdog ingestion failed:', err.message);
    underdogResult.errors.push(err.message);
  }

  results['Underdog'] = underdogResult;

  // Summary
  console.log('\n[INGESTION] ========================================');
  console.log('[INGESTION] Ingestion Summary:');
  for (const [platform, result] of Object.entries(results)) {
    console.log(`[INGESTION] ${platform}: ${result.scraped} scraped, ${result.inserted} inserted`);
    if (result.errors.length > 0) {
      console.log(`[INGESTION] ${platform} errors: ${result.errors.join(', ')}`);
    }
  }
  console.log('[INGESTION] ========================================\n');

  return results;
}
