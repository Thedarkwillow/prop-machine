import { browserIngestor } from "./browserIngestor.js";

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
 * Replaces all API-based ingestion
 */
export async function ingestAllProps(sports: string[] = ['NBA', 'NFL', 'NHL']): Promise<IngestionResult> {
  console.log('[INGEST] Starting browser-based prop ingestion');
  console.log(`[INGEST] Sports: ${sports.join(', ')}`);

  // Delegate to browser ingestor
  const result = await browserIngestor.ingestAll(sports);

  // Map browser ingestor result to expected format
  return {
    fetched: result.fetched,
    upserted: result.upserted,
    updated: result.updated,
    invalid: result.invalid,
    errors: result.errors,
    byPlatform: result.byPlatform,
  };
}



