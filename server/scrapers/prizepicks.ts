import { Browser } from 'playwright';
import type { RawProp } from './normalize.js';

const PRIZEPICKS_URL = 'https://app.prizepicks.com/';

/**
 * Scrape props from PrizePicks
 */
export async function scrapePrizePicksProps(browser: Browser): Promise<RawProp[]> {
  const page = await browser.newPage();
  page.setDefaultTimeout(60000);

  console.log('[SCRAPER][PRIZEPICKS] Navigating to PrizePicks...');
  
  try {
    await page.goto(PRIZEPICKS_URL, { waitUntil: 'networkidle', timeout: 60000 });
    console.log('[SCRAPER][PRIZEPICKS] Page loaded');

    // Check if redirected to login
    const currentUrl = page.url();
    if (currentUrl.includes('/login') || currentUrl.includes('/signin')) {
      throw new Error('PrizePicks login required — session cookies missing');
    }

    // Wait for projection cards
    console.log('[SCRAPER][PRIZEPICKS] Waiting for projection cards...');
    await page.waitForSelector('div[data-testid="projection-card"]', { timeout: 15000 });

    // Scroll to load all cards
    console.log('[SCRAPER][PRIZEPICKS] Scrolling to load all props...');
    let previousCount = 0;
    let stableScrolls = 0;

    for (let i = 0; i < 20; i++) {
      const cards = await page.locator('div[data-testid="projection-card"]').all();
      const currentCount = cards.length;

      if (currentCount === previousCount) {
        stableScrolls++;
        if (stableScrolls >= 2) break;
      } else {
        stableScrolls = 0;
      }

      previousCount = currentCount;
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
      await page.waitForTimeout(1000);
    }

    // Extract all cards
    const allCards = await page.locator('div[data-testid="projection-card"]').all();
    console.log(`[SCRAPER][PRIZEPICKS] Cards found: ${allCards.length}`);

    if (allCards.length === 0) {
      console.warn('[SCRAPER][PRIZEPICKS] ⚠️  No projection cards found!');
      return [];
    }

    const props: RawProp[] = [];

    for (let i = 0; i < allCards.length; i++) {
      try {
        const card = allCards[i];

        // Extract player name
        const playerEl = card.locator('span[data-testid="player-name"]').first();
        const player = await playerEl.textContent();
        if (!player || !player.trim()) continue;

        // Extract stat name
        const statEl = card.locator('span[data-testid="stat-name"]').first();
        const stat = await statEl.textContent();
        if (!stat || !stat.trim()) continue;

        // Extract line score
        const lineEl = card.locator('span[data-testid="line-score"]').first();
        const lineText = await lineEl.textContent();
        if (!lineText) continue;
        const line = parseFloat(lineText.replace(/[^\d.]/g, ''));
        if (isNaN(line)) continue;

        // Extract team/opponent
        let team: string | null = null;
        let opponent: string | null = null;
        try {
          const teamEls = await card.locator('span[data-testid="team-abbrev"]').all();
          if (teamEls.length >= 1) {
            team = (await teamEls[0].textContent())?.trim().toUpperCase() || null;
          }
          if (teamEls.length >= 2) {
            opponent = (await teamEls[1].textContent())?.trim().toUpperCase() || null;
          }
        } catch {}

        // Infer sport from stat or page context
        let sport: 'NBA' | 'NFL' | 'NHL' | 'MLB' = 'NBA';
        const statUpper = stat.toUpperCase();
        const pageText = await page.textContent().catch(() => '');
        
        if (statUpper.includes('SOG') || statUpper.includes('SHOTS') || statUpper.includes('GOALS') || statUpper.includes('SAVES')) {
          sport = 'NHL';
        } else if (statUpper.includes('YARDS') || statUpper.includes('TOUCHDOWN') || statUpper.includes('RECEPTION')) {
          sport = 'NFL';
        } else if (statUpper.includes('HITS') || statUpper.includes('STRIKEOUT') || statUpper.includes('RBIS')) {
          sport = 'MLB';
        } else if (pageText.includes('NHL') || pageText.includes('hockey')) {
          sport = 'NHL';
        } else if (pageText.includes('NFL') || pageText.includes('football')) {
          sport = 'NFL';
        } else if (pageText.includes('MLB') || pageText.includes('baseball')) {
          sport = 'MLB';
        }

        // Infer direction (default to over)
        const direction: 'over' | 'under' = 'over';

        props.push({
          player: player.trim(),
          stat: stat.trim(),
          line,
          direction,
          sport,
          team,
          opponent,
          gameTime: null,
        });

        // Log first 3 props
        if (i < 3) {
          console.log(`[SCRAPER][PRIZEPICKS] Sample prop ${i + 1}:`, JSON.stringify(props[props.length - 1]));
        }
      } catch (error) {
        console.warn(`[SCRAPER][PRIZEPICKS] Error extracting card ${i + 1}:`, error);
        continue;
      }
    }

    console.log(`[SCRAPER][PRIZEPICKS] Successfully extracted ${props.length} props`);
    return props;
  } catch (error) {
    const err = error as Error;
    console.error('[SCRAPER][PRIZEPICKS] ❌ Scraping failed:', err.message);
    throw err;
  } finally {
    await page.close();
  }
}
