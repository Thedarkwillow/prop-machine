import { Browser } from 'playwright';
import type { RawProp } from './normalize.js';

const UNDERDOG_URL = 'https://underdogfantasy.com/pick-em';

/**
 * Scrape props from Underdog Pick'Em page
 */
export async function scrapeUnderdogProps(browser: Browser): Promise<RawProp[]> {
  const page = await browser.newPage();
  page.setDefaultTimeout(60000);

  console.log('[SCRAPER][UNDERDOG] Navigating to Underdog Pick\'em...');
  
  try {
    await page.goto(UNDERDOG_URL, { waitUntil: 'networkidle', timeout: 60000 });
    console.log('[SCRAPER][UNDERDOG] Page loaded');

    // Wait for prop cards to appear
    console.log('[SCRAPER][UNDERDOG] Waiting for prop cards...');
    await page.waitForSelector('div[data-testid="pick-card"]', { timeout: 15000 });

    // Scroll to load all cards
    console.log('[SCRAPER][UNDERDOG] Scrolling to load all props...');
    let previousCount = 0;
    let stableScrolls = 0;

    for (let i = 0; i < 20; i++) {
      const cards = await page.locator('div[data-testid="pick-card"]').all();
      const currentCount = cards.length;

      if (currentCount === previousCount) {
        stableScrolls++;
        if (stableScrolls >= 2) break;
      } else {
        stableScrolls = 0;
      }

      previousCount = currentCount;
      await page.evaluate(() => window.scrollBy(0, window.innerHeight));
      await page.waitForTimeout(500);
    }

    // Extract all cards
    const allCards = await page.locator('div[data-testid="pick-card"]').all();
    console.log(`[SCRAPER][UNDERDOG] Cards found: ${allCards.length}`);

    if (allCards.length === 0) {
      console.warn('[SCRAPER][UNDERDOG] ⚠️  No prop cards found!');
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

        // Extract stat type
        const statEl = card.locator('span[data-testid="stat-type"]').first();
        const stat = await statEl.textContent();
        if (!stat || !stat.trim()) continue;

        // Extract line value
        const lineEl = card.locator('span[data-testid="line-value"]').first();
        const lineText = await lineEl.textContent();
        if (!lineText) continue;
        const line = parseFloat(lineText.replace(/[^\d.]/g, ''));
        if (isNaN(line)) continue;

        // Extract matchup (team/opponent)
        let team: string | null = null;
        let opponent: string | null = null;
        try {
          const matchupEl = card.locator('span[data-testid="matchup"]').first();
          const matchup = await matchupEl.textContent();
          if (matchup) {
            // Try to parse team vs opponent from matchup text
            const matchupMatch = matchup.match(/([A-Z]{2,3})\s*(?:vs|@)\s*([A-Z]{2,3})/i);
            if (matchupMatch) {
              team = matchupMatch[1].toUpperCase();
              opponent = matchupMatch[2].toUpperCase();
            }
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

        // Infer direction (default to over, can be enhanced later)
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
          console.log(`[SCRAPER][UNDERDOG] Sample prop ${i + 1}:`, JSON.stringify(props[props.length - 1]));
        }
      } catch (error) {
        console.warn(`[SCRAPER][UNDERDOG] Error extracting card ${i + 1}:`, error);
        continue;
      }
    }

    console.log(`[SCRAPER][UNDERDOG] Successfully extracted ${props.length} props`);
    return props;
  } catch (error) {
    const err = error as Error;
    console.error('[SCRAPER][UNDERDOG] ❌ Scraping failed:', err.message);
    throw err;
  } finally {
    await page.close();
  }
}
