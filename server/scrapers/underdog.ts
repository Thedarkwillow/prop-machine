import { Page } from 'playwright';
import {
  createBrowserContext,
  getBrowserConfig,
  saveStorageState,
  saveDebugArtifacts,
  captureConsoleLogs,
} from './browser.js';
import type { RawProp } from './normalize.js';

const UNDERDOG_URL = 'https://underdogfantasy.com/pick-em';

/**
 * Extract player name from card element
 */
async function extractPlayerName(card: any): Promise<string | null> {
  // Try multiple selectors for player name
  const selectors = [
    'div[data-testid*="player"]',
    'div[data-testid*="name"]',
    'h2', 'h3', 'h4',
    '[class*="player"]',
    '[class*="name"]',
    'strong',
  ];

  for (const selector of selectors) {
    try {
      const el = card.locator(selector).first();
      if (await el.isVisible()) {
        const text = await el.textContent();
        if (text && text.trim() && text.trim().length > 2) {
          // Check if it looks like a name (has at least one space or is capitalized)
          if (text.trim().includes(' ') || /^[A-Z][a-z]+/.test(text.trim())) {
            return text.trim();
          }
        }
      }
    } catch {}
  }

  // Fallback: get first significant text element
  try {
    const allText = await card.textContent();
    if (allText) {
      const lines = allText.split('\n').map(l => l.trim()).filter(l => l.length > 2);
      // Look for name-like patterns (two words, capitalized)
      for (const line of lines) {
        if (/^[A-Z][a-z]+ [A-Z][a-z]+/.test(line)) {
          return line;
        }
      }
      // Return first non-empty line as fallback
      if (lines.length > 0) return lines[0];
    }
  } catch {}

  return null;
}

/**
 * Extract stat category from card
 */
async function extractStat(card: any): Promise<string | null> {
  const statPatterns = /(PTS|REB|AST|Points|Rebounds|Assists|Shots|Saves|Goals|SOG|BLK|STL|TO)/i;
  
  const selectors = [
    'div[data-testid*="stat"]',
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
 * Extract line value from card
 */
async function extractLine(card: any): Promise<number | null> {
  const allText = await card.textContent().catch(() => '');
  if (!allText) return null;

  // Look for decimal/float patterns
  const floatPattern = /(\d+\.?\d*)/g;
  const matches = allText.match(floatPattern);
  
  if (matches) {
    // Try to find the most likely line value (usually between 0.5 and 100)
    for (const match of matches) {
      const value = parseFloat(match);
      if (!isNaN(value) && value >= 0.5 && value <= 200) {
        return value;
      }
    }
  }

  return null;
}

/**
 * Extract direction (over/under) from card
 */
async function extractDirection(card: any): Promise<'over' | 'under' | null> {
  const selectors = [
    'button[data-testid*="over"]',
    'button[data-testid*="under"]',
    'button[data-testid*="higher"]',
    'button[data-testid*="lower"]',
    '[class*="over"]',
    '[class*="under"]',
  ];

  for (const selector of selectors) {
    try {
      const overBtn = card.locator(selector).filter({ hasText: /over|higher/i }).first();
      const underBtn = card.locator(selector).filter({ hasText: /under|lower/i }).first();
      
      if (await overBtn.isVisible()) {
        const selected = await overBtn.getAttribute('aria-selected').catch(() => null);
        if (selected === 'true') return 'over';
      }
      if (await underBtn.isVisible()) {
        const selected = await underBtn.getAttribute('aria-selected').catch(() => null);
        if (selected === 'true') return 'under';
      }
    } catch {}
  }

  return null;
}

/**
 * Extract sport from page context
 */
async function extractSport(page: Page): Promise<string> {
  try {
    // Check for sport tabs or filters
    const sportSelectors = [
      '[data-testid*="sport"]',
      '[class*="sport"]',
      '[class*="league"]',
      'button[aria-selected="true"]',
    ];

    for (const selector of sportSelectors) {
      try {
        const el = await page.locator(selector).first();
        if (await el.isVisible()) {
          const text = await el.textContent();
          if (text && /NBA|NHL|NFL|MLB/i.test(text)) {
            return text.trim();
          }
        }
      } catch {}
    }

    // Check page URL or title
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
 * Scrape Underdog props
 */
export async function scrapeUnderdogProps(): Promise<RawProp[]> {
  const config = getBrowserConfig('underdog');
  const { browser, context } = await createBrowserContext(config);
  const page = await context.newPage();
  page.setDefaultTimeout(60000);

  const consoleLogs = captureConsoleLogs(page);
  const extractedItems: any[] = [];

  console.log('[SCRAPER][UNDERDOG] Starting Underdog prop scraping...');
  console.log(`[SCRAPER][UNDERDOG] Headless: ${config.headless}, Debug: ${config.debug}`);

  try {
    // Navigate to Underdog Pick'em
    console.log('[SCRAPER][UNDERDOG] Navigating to Underdog Pick\'em...');
    await page.goto(UNDERDOG_URL, { waitUntil: 'networkidle', timeout: 60000 });
    await page.waitForTimeout(3000);

    // Wait for pick'em board to load
    console.log('[SCRAPER][UNDERDOG] Waiting for pick\'em board...');
    const containerSelectors = [
      '[data-testid*="pickem"]',
      '[data-testid*="pick-em"]',
      'main',
      '[class*="board"]',
      '[class*="grid"]',
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
      console.warn('[SCRAPER][UNDERDOG] Container not found with primary selectors');
    }

    // Extract sport
    const sport = await extractSport(page);
    console.log(`[SCRAPER][UNDERDOG] Detected sport: ${sport}`);

    // Scroll to load all cards
    console.log('[SCRAPER][UNDERDOG] Scrolling to load all props...');
    let previousCount = 0;
    let stableScrolls = 0;

    for (let i = 0; i < 50; i++) {
      const cardSelectors = [
        '[data-testid*="player"]',
        '[data-testid*="pickem-card"]',
        'article',
        '[role="button"]',
        '[class*="card"]',
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
          console.log(`[SCRAPER][UNDERDOG] Scrolled ${i + 1} times, found ${currentCount} cards`);
          break;
        }
      } else {
        stableScrolls = 0;
      }

      previousCount = currentCount;
      await page.evaluate(() => window.scrollBy(0, window.innerHeight));
      await page.waitForTimeout(750);
    }

    // Extract props from cards
    const allCardSelectors = [
      '[data-testid*="player"]',
      '[data-testid*="pickem-card"]',
      'article',
      '[role="button"]',
      '[class*="card"]',
    ];

    let allCards: any[] = [];
    for (const selector of allCardSelectors) {
      try {
        allCards = await page.locator(selector).all();
        if (allCards.length > 0) break;
      } catch {}
    }

    console.log(`[SCRAPER][UNDERDOG] Extracting data from ${allCards.length} cards...`);

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
        console.warn(`[SCRAPER][UNDERDOG] Error extracting card ${i}:`, error);
      }
    }

    console.log(`[SCRAPER][UNDERDOG] Successfully extracted ${rawProps.length} props`);

    // Save debug artifacts if enabled
    if (config.debug) {
      await saveDebugArtifacts(page, 'underdog', extractedItems, consoleLogs, config);
    }

    // Save storage state (in case auth was refreshed)
    await saveStorageState(context, config.storageStateFile);

    return rawProps;
  } catch (error) {
    const err = error as Error;
    console.error('[SCRAPER][UNDERDOG] ❌ Scraping failed:', err.message);
    
    if (config.debug) {
      await saveDebugArtifacts(page, 'underdog', extractedItems, consoleLogs, config);
    }
    
    throw err;
  } finally {
    await page.close();
    await context.close();
    await browser.close();
    console.log('[SCRAPER][UNDERDOG] Browser closed');
  }
}
