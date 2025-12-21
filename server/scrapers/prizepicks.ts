import { Page } from 'playwright';
import {
  createBrowserContext,
  getBrowserConfig,
  saveStorageState,
  saveDebugArtifacts,
  captureConsoleLogs,
} from './browser.js';
import type { RawProp } from './normalize.js';

const PRIZEPICKS_URL = 'https://app.prizepicks.com/';

/**
 * Extract player name from card
 */
async function extractPlayerName(card: any): Promise<string | null> {
  const selectors = [
    '[data-testid*="player"]',
    '[data-testid*="name"]',
    '[class*="player"]',
    '[class*="name"]',
    'h2', 'h3', 'h4',
    'strong',
  ];

  for (const selector of selectors) {
    try {
      const el = card.locator(selector).first();
      if (await el.isVisible()) {
        const text = await el.textContent();
        if (text && text.trim() && text.trim().length > 2) {
          return text.trim();
        }
      }
    } catch {}
  }

  // Fallback
  try {
    const allText = await card.textContent();
    if (allText) {
      const lines = allText.split('\n').map(l => l.trim()).filter(l => l.length > 2);
      for (const line of lines) {
        if (/^[A-Z][a-z]+ [A-Z][a-z]+/.test(line)) {
          return line;
        }
      }
      if (lines.length > 0) return lines[0];
    }
  } catch {}

  return null;
}

/**
 * Extract stat category
 */
async function extractStat(card: any): Promise<string | null> {
  const statPatterns = /(PTS|REB|AST|Points|Rebounds|Assists|Shots|Saves|Goals|SOG|BLK|STL|TO)/i;
  
  const selectors = [
    '[data-testid*="stat"]',
    '[class*="stat"]',
    'span',
    'div',
  ];

  for (const selector of selectors) {
    try {
      const elements = await card.locator(selector).all();
      for (const el of elements) {
        const text = await el.textContent();
        if (text && statPatterns.test(text)) {
          return text.trim();
        }
      }
    } catch {}
  }

  return null;
}

/**
 * Extract line value
 */
async function extractLine(card: any): Promise<number | null> {
  // Try to find projection value
  const selectors = [
    '[data-testid*="projection"]',
    '[data-testid*="line"]',
    '[data-testid*="value"]',
    '[class*="line"]',
    '[class*="value"]',
  ];

  for (const selector of selectors) {
    try {
      const el = card.locator(selector).first();
      if (await el.isVisible()) {
        const text = await el.textContent();
        if (text) {
          const floatMatch = text.match(/(\d+\.?\d*)/);
          if (floatMatch) {
            const value = parseFloat(floatMatch[0]);
            if (!isNaN(value) && value >= 0.5) {
              return value;
            }
          }
        }
      }
    } catch {}
  }

  // Fallback: search all text
  const allText = await card.textContent().catch(() => '');
  if (allText) {
    const floatPattern = /(\d+\.?\d*)/g;
    const matches = allText.match(floatPattern);
    if (matches) {
      for (const match of matches) {
        const value = parseFloat(match);
        if (!isNaN(value) && value >= 0.5 && value <= 200) {
          return value;
        }
      }
    }
  }

  return null;
}

/**
 * Extract direction
 */
async function extractDirection(card: any): Promise<'over' | 'under' | null> {
  const allText = await card.textContent().catch(() => '');
  if (allText) {
    if (/over|higher/i.test(allText)) return 'over';
    if (/under|lower/i.test(allText)) return 'under';
  }
  return null;
}

/**
 * Extract sport from page
 */
async function extractSport(page: Page): Promise<string> {
  try {
    const sportSelectors = [
      '[data-testid*="league"]',
      '[class*="league"]',
      'button[aria-selected="true"]',
      '[class*="sport"]',
    ];

    for (const selector of sportSelectors) {
      try {
        const elements = await page.locator(selector).all();
        for (const el of elements) {
          const text = await el.textContent();
          if (text && /NBA|NHL|NFL|MLB/i.test(text)) {
            return text.trim();
          }
        }
      } catch {}
    }

    const url = page.url();
    const title = await page.title().catch(() => '');
    const combined = url + ' ' + title;
    
    if (/NBA|basketball/i.test(combined)) return 'NBA';
    if (/NHL|hockey/i.test(combined)) return 'NHL';
    if (/NFL|football/i.test(combined)) return 'NFL';
    if (/MLB|baseball/i.test(combined)) return 'MLB';
  } catch {}

  return 'UNKNOWN';
}

/**
 * Scrape PrizePicks props
 */
export async function scrapePrizePicksProps(): Promise<RawProp[]> {
  const config = getBrowserConfig('prizepicks');
  const { browser, context } = await createBrowserContext(config);
  const page = await context.newPage();
  page.setDefaultTimeout(60000);

  const consoleLogs = captureConsoleLogs(page);
  const extractedItems: any[] = [];

  console.log('[SCRAPER][PRIZEPICKS] Starting PrizePicks prop scraping...');
  console.log(`[SCRAPER][PRIZEPICKS] Headless: ${config.headless}, Debug: ${config.debug}`);

  try {
    // Navigate to PrizePicks
    console.log('[SCRAPER][PRIZEPICKS] Navigating to PrizePicks...');
    await page.goto(PRIZEPICKS_URL, { waitUntil: 'networkidle', timeout: 60000 });
    await page.waitForTimeout(5000);

    // Wait for projections list
    console.log('[SCRAPER][PRIZEPICKS] Waiting for projections...');
    const containerSelectors = [
      '[data-testid*="projection"]',
      '[data-testid*="board"]',
      'main',
      '[class*="projection"]',
      '[class*="board"]',
    ];

    let containerFound = false;
    for (const selector of containerSelectors) {
      try {
        await page.waitForSelector(selector, { timeout: 5000 });
        containerFound = true;
        break;
      } catch {}
    }

    if (!containerFound) {
      console.warn('[SCRAPER][PRIZEPICKS] Container not found with primary selectors');
    }

    const sport = await extractSport(page);
    console.log(`[SCRAPER][PRIZEPICKS] Detected sport: ${sport}`);

    // Scroll to load all projections
    console.log('[SCRAPER][PRIZEPICKS] Scrolling to load all props...');
    let previousCount = 0;
    let stableScrolls = 0;

    for (let i = 0; i < 50; i++) {
      const cardSelectors = [
        '[data-testid*="projection"]',
        '[class*="projection"]',
        '[class*="card"]',
        'article',
      ];

      let cards: any[] = [];
      for (const selector of cardSelectors) {
        try {
          cards = await page.locator(selector).all();
          if (cards.length > 0) break;
        } catch {}
      }

      const currentCount = cards.length;

      if (currentCount === previousCount) {
        stableScrolls++;
        if (stableScrolls >= 2) {
          console.log(`[SCRAPER][PRIZEPICKS] Scrolled ${i + 1} times, found ${currentCount} cards`);
          break;
        }
      } else {
        stableScrolls = 0;
      }

      previousCount = currentCount;
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
      await page.waitForTimeout(1000);
    }

    // Extract props
    const allCardSelectors = [
      '[data-testid*="projection"]',
      '[class*="projection"]',
      '[class*="card"]',
      'article',
    ];

    let allCards: any[] = [];
    for (const selector of allCardSelectors) {
      try {
        allCards = await page.locator(selector).all();
        if (allCards.length > 0) break;
      } catch {}
    }

    console.log(`[SCRAPER][PRIZEPICKS] Extracting data from ${allCards.length} cards...`);

    const rawProps: RawProp[] = [];

    for (let i = 0; i < allCards.length; i++) {
      try {
        const card = allCards[i];
        const player = await extractPlayerName(card);
        const stat = await extractStat(card);
        const line = await extractLine(card);
        const direction = await extractDirection(card);

        if (!player || !stat || line === null) {
          continue;
        }

        const rawProp: RawProp = {
          player,
          stat,
          line,
          direction,
          sport,
          team: null,
          opponent: null,
          gameTime: null,
        };

        rawProps.push(rawProp);
        extractedItems.push({ index: i, ...rawProp });
      } catch (error) {
        console.warn(`[SCRAPER][PRIZEPICKS] Error extracting card ${i}:`, error);
      }
    }

    console.log(`[SCRAPER][PRIZEPICKS] Successfully extracted ${rawProps.length} props`);

    // Save debug artifacts if enabled
    if (config.debug) {
      await saveDebugArtifacts(page, 'prizepicks', extractedItems, consoleLogs, config);
    }

    // Save storage state
    await saveStorageState(context, config.storageStateFile);

    return rawProps;
  } catch (error) {
    const err = error as Error;
    console.error('[SCRAPER][PRIZEPICKS] ❌ Scraping failed:', err.message);
    
    if (config.debug) {
      await saveDebugArtifacts(page, 'prizepicks', extractedItems, consoleLogs, config);
    }
    
    throw err;
  } finally {
    await page.close();
    await context.close();
    await browser.close();
    console.log('[SCRAPER][PRIZEPICKS] Browser closed');
  }
}
