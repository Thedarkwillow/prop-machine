import { PrizePicksScraper } from '../scrapers/prizepicks.scraper.js';
import { ScrapedProp } from '../scrapers/baseScraper.js';
import { PropInput } from '../scrapers/types.js';
import { db } from '../db.js';
import { props } from '@shared/schema.js';
import { eq, and } from 'drizzle-orm';
import type { InsertProp } from '@shared/schema.js';

export interface IngestionResult {
  success: boolean;
  scraped: number;
  inserted: number;
  errors: string[];
}

/**
 * Normalize scraped prop to PropInput format
 */
function normalizeProp(scraped: ScrapedProp, platform: 'Underdog' | 'PrizePicks'): PropInput | null {
  // Validate required fields
  if (!scraped.player || !scraped.stat || !scraped.line || !scraped.sport) {
    return null;
  }

  // Validate sport
  const validSports: ('NBA' | 'NHL' | 'NFL' | 'MLB')[] = ['NBA', 'NHL', 'NFL', 'MLB'];
  if (!validSports.includes(scraped.sport as any)) {
    return null;
  }

  return {
    sport: scraped.sport as 'NBA' | 'NHL' | 'NFL' | 'MLB',
    platform,
    player: scraped.player.trim(),
    team: scraped.team || null,
    opponent: scraped.opponent || null,
    stat: scraped.stat,
    line: scraped.line,
    currentLine: scraped.line,
    direction: scraped.direction,
    period: 'full_game',
    gameTime: scraped.gameTime || null,
    confidence: null,
    ev: null,
    modelProbability: null,
  };
}

/**
 * Convert PropInput to InsertProp for database
 */
function toInsertProp(prop: PropInput): InsertProp {
  return {
    sport: prop.sport,
    player: prop.player,
    team: prop.team || 'TBD',
    opponent: prop.opponent || 'TBD',
    stat: prop.stat,
    line: prop.line.toString(),
    currentLine: prop.currentLine.toString(),
    direction: prop.direction,
    period: 'full_game',
    platform: prop.platform,
    fixtureId: null,
    marketId: null,
    gameTime: prop.gameTime || new Date(),
    confidence: 50, // Default confidence
    ev: "0",
    modelProbability: "0.5",
  };
}

/**
 * Ingest PrizePicks props
 */
export async function ingestPrizePicks(): Promise<IngestionResult> {
  const result: IngestionResult = {
    success: false,
    scraped: 0,
    inserted: 0,
    errors: [],
  };

  console.log('\n[INGESTION][PRIZEPICKS] ========================================');
  console.log('[INGESTION][PRIZEPICKS] Starting PrizePicks ingestion');
  console.log('[INGESTION][PRIZEPICKS] ========================================\n');

  try {
    // Run scraper
    const scraper = new PrizePicksScraper();
    const scrapedProps = await scraper.scrape();
    result.scraped = scrapedProps.length;

    console.log(`[INGESTION][PRIZEPICKS] Scraped ${result.scraped} props`);

    if (result.scraped === 0) {
      console.warn('[INGESTION][PRIZEPICKS] ⚠️  Scraper returned 0 props — scraper may have failed');
      return result;
    }

    // Normalize props
    console.log('[INGESTION][PRIZEPICKS] Normalizing props...');
    const normalizedProps: PropInput[] = [];
    for (const scraped of scrapedProps) {
      const normalized = normalizeProp(scraped, 'PrizePicks');
      if (normalized) {
        normalizedProps.push(normalized);
      } else {
        result.errors.push(`Failed to normalize prop: ${scraped.player} ${scraped.stat}`);
      }
    }

    console.log(`[INGESTION][PRIZEPICKS] Normalized ${normalizedProps.length} props`);

    if (normalizedProps.length === 0) {
      console.warn('[INGESTION][PRIZEPICKS] ⚠️  No props to insert after normalization');
      return result;
    }

    // Delete existing PrizePicks props (grouped by sport for efficiency)
    console.log('[INGESTION][PRIZEPICKS] Clearing old PrizePicks props from database...');
    const sports = ['NBA', 'NFL', 'NHL', 'MLB'] as const;
    
    await db.transaction(async (tx) => {
      for (const sport of sports) {
        await tx.delete(props).where(and(
          eq(props.platform, 'PrizePicks'),
          eq(props.sport, sport)
        ));
      }
    });
    console.log('[INGESTION][PRIZEPICKS] Cleared old props');

    // Insert new props in transaction
    console.log(`[INGESTION][PRIZEPICKS] Inserting ${normalizedProps.length} props into database...`);
    
    await db.transaction(async (tx) => {
      const insertProps: InsertProp[] = normalizedProps.map(toInsertProp);
      
      // Bulk insert
      await tx.insert(props).values(insertProps);
    });

    result.inserted = normalizedProps.length;
    result.success = true;

    console.log(`[INGESTION][PRIZEPICKS] ✅ Successfully inserted ${result.inserted} props`);

  } catch (error) {
    const err = error as Error;
    console.error(`[INGESTION][PRIZEPICKS] ❌ Ingestion failed:`, err);
    result.errors.push(`Ingestion failed: ${err.message}`);
  }

  // Final summary
  console.log('\n[INGESTION][PRIZEPICKS] ========================================');
  console.log(`[INGESTION][PRIZEPICKS] Summary:`);
  console.log(`[INGESTION][PRIZEPICKS]   - Props scraped: ${result.scraped}`);
  console.log(`[INGESTION][PRIZEPICKS]   - Props inserted: ${result.inserted}`);
  console.log(`[INGESTION][PRIZEPICKS]   - Success: ${result.success ? '✅' : '❌'}`);
  console.log(`[INGESTION][PRIZEPICKS]   - Errors: ${result.errors.length}`);
  if (result.errors.length > 0 && result.errors.length <= 5) {
    result.errors.forEach(err => console.log(`[INGESTION][PRIZEPICKS]     - ${err}`));
  }
  console.log('[INGESTION][PRIZEPICKS] ========================================\n');

  return result;
}

