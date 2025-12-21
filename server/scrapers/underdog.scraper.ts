import { chromium, Browser, BrowserContext, Page } from 'playwright';
import * as path from 'path';
import * as fs from 'fs';
import type { NormalizedProp } from './types.js';
import { normalizeStat } from '../utils/statNormalizer.js';

const UNDERDOG_URL = 'https://underdogfantasy.com/pick-em';
const USER_DATA_DIR = path.resolve(process.cwd(), '.browser', 'underdog');

/**
 * Underdog scraper using Playwright with persistent browser context
 */
export async function scrapeUnderdogProps(): Promise<NormalizedProp[]> {
  const headless = process.env.HEADLESS === 'true';
  let browser: Browser | null = null;
  let context: BrowserContext | null = null;
  let page: Page | null = null;

  console.log('[SCRAPER][UNDERDOG] Starting Underdog prop scraping...');
  console.log(`[SCRAPER][UNDERDOG] Browser mode: ${headless ? 'headless' : 'headed'}`);
  console.log(`[SCRAPER][UNDERDOG] User data dir: ${USER_DATA_DIR}`);

  try {
    // Ensure user data directory exists
    if (!fs.existsSync(USER_DATA_DIR)) {
      fs.mkdirSync(USER_DATA_DIR, { recursive: true });
    }

    // Launch browser with persistent context
    browser = await chromium.launch({
      headless,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });

    context = await browser.newContext({
      userDataDir: USER_DATA_DIR,
      viewport: { width: 1920, height: 1080 },
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    });

    page = await context.newPage();
    page.setDefaultTimeout(60000);

    // Navigate to Underdog Pick'em page
    console.log('[SCRAPER][UNDERDOG] Navigating to Underdog Pick\'em page...');
    await page.goto(UNDERDOG_URL, {
      waitUntil: 'networkidle',
      timeout: 60000,
    });

    // Wait a bit for page to fully load
    await page.waitForTimeout(3000);

    // Wait for prop cards to appear
    console.log('[SCRAPER][UNDERDOG] Waiting for prop cards to load...');
    try {
      await page.waitForSelector('div[data-testid="pick-em-prop"]', { timeout: 15000 });
    } catch (error) {
      console.warn('[SCRAPER][UNDERDOG] Prop cards selector not found, continuing anyway...');
    }

    // Scroll until no new cards appear
    console.log('[SCRAPER][UNDERDOG] Scrolling to load all props...');
    let previousCount = 0;
    let stableScrolls = 0;
    const maxScrolls = 50;

    for (let i = 0; i < maxScrolls; i++) {
      const cards = await page.locator('div[data-testid="pick-em-prop"]').all();
      const currentCount = cards.length;

      if (currentCount === previousCount) {
        stableScrolls++;
        if (stableScrolls >= 2) {
          console.log(`[SCRAPER][UNDERDOG] Scrolled ${i + 1} times, found ${currentCount} props (count stabilized)`);
          break;
        }
      } else {
        stableScrolls = 0;
      }

      previousCount = currentCount;

      // Scroll down
      await page.evaluate(() => {
        window.scrollBy(0, window.innerHeight);
      });

      // Wait for content to load
      await page.waitForTimeout(750);
    }

    // Extract props from all cards
    const allCards = await page.locator('div[data-testid="pick-em-prop"]').all();
    console.log(`[SCRAPER][UNDERDOG] Extracting data from ${allCards.length} prop cards...`);

    const normalizedProps: NormalizedProp[] = [];

    for (let i = 0; i < allCards.length; i++) {
      try {
        const card = allCards[i];

        // Extract player name
        const playerEl = card.locator('div[data-testid="player-name"]').first();
        const player = await playerEl.textContent();
        if (!player || !player.trim()) continue;

        // Extract stat type
        const statEl = card.locator('div[data-testid="stat-type"]').first();
        let stat = await statEl.textContent();
        if (!stat || !stat.trim()) continue;
        stat = normalizeStat(stat.trim());

        // Extract line value
        const lineEl = card.locator('div[data-testid="line-value"]').first();
        const lineText = await lineEl.textContent();
        if (!lineText) continue;
        const line = parseFloat(lineText.replace(/[^\d.]/g, ''));
        if (isNaN(line)) continue;

        // Extract direction (check which button is selected)
        const overButton = card.locator('button[data-testid="over"]').first();
        const underButton = card.locator('button[data-testid="under"]').first();
        
        let direction: 'over' | 'under' = 'over';
        const overSelected = await overButton.getAttribute('aria-selected').catch(() => null);
        const underSelected = await underButton.getAttribute('aria-selected').catch(() => null);
        
        if (underSelected === 'true') {
          direction = 'under';
        } else if (overSelected === 'true') {
          direction = 'over';
        } else {
          // Fallback: check classes
          const overClasses = await overButton.getAttribute('class').catch(() => '');
          const underClasses = await underButton.getAttribute('class').catch(() => '');
          if (underClasses?.includes('active') || underClasses?.includes('selected')) {
            direction = 'under';
          }
        }

        // Extract game time (if available)
        let gameTime: Date | null = null;
        try {
          const timeEl = card.locator('div[data-testid="game-time"]').first();
          const timeText = await timeEl.textContent();
          if (timeText) {
            gameTime = new Date(timeText);
            if (isNaN(gameTime.getTime())) gameTime = null;
          }
        } catch {
          gameTime = null;
        }

        // Extract opponent (if available in card)
        let opponent: string | null = null;
        let team: string | null = null;
        try {
          const cardText = await card.textContent();
          const opponentMatch = cardText?.match(/(?:vs|@)\s*([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/i);
          opponent = opponentMatch ? opponentMatch[1].trim() : null;
        } catch {
          opponent = null;
        }

        // Detect sport from page context
        const pageText = await page.textContent();
        let sport: 'NBA' | 'NHL' | 'NFL' | 'MLB' = 'NBA';
        if (pageText?.includes('NFL') || pageText?.includes('football')) sport = 'NFL';
        else if (pageText?.includes('NHL') || pageText?.includes('hockey')) sport = 'NHL';
        else if (pageText?.includes('MLB') || pageText?.includes('baseball')) sport = 'MLB';
        else if (pageText?.includes('NBA') || pageText?.includes('basketball')) sport = 'NBA';

        normalizedProps.push({
          sport,
          platform: 'Underdog',
          player: player.trim(),
          team,
          opponent,
          stat,
          line,
          direction,
          period: 'game',
          gameTime,
          confidence: null,
          ev: null,
        });
      } catch (error) {
        console.warn(`[SCRAPER][UNDERDOG] Error extracting prop ${i + 1}:`, error);
        continue;
      }
    }

    console.log(`[SCRAPER][UNDERDOG] Successfully extracted ${normalizedProps.length} props`);
    return normalizedProps;

  } catch (error) {
    const err = error as Error;
    console.error('[SCRAPER][UNDERDOG] ❌ Scraping failed:', err.message);
    throw err;
  } finally {
    if (page) await page.close().catch(() => {});
    if (context) await context.close().catch(() => {});
    if (browser) await browser.close().catch(() => {});
    console.log('[SCRAPER][UNDERDOG] Browser closed');
  }
}
