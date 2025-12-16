import { Page } from 'playwright';
import { BaseScraper, ScrapedProp } from './baseScraper.js';
import { normalizeStat } from '../utils/statNormalizer.js';

export class PrizePicksScraper extends BaseScraper {
  constructor() {
    super({
      platform: 'PRIZEPICKS',
      cookieFileName: 'prizepicks.json',
      loginUrl: 'https://app.prizepicks.com/',
    });
  }

  protected async isLoggedIn(page: Page): Promise<boolean> {
    try {
      await page.waitForTimeout(2000);
      
      const loginButton = page.locator('text=/sign in|log in|login/i').first();
      const userMenu = page.locator('[data-testid*="user"], [class*="user"], [class*="profile"]').first();
      
      if (await loginButton.isVisible().catch(() => false)) {
        return false;
      }
      if (await userMenu.isVisible().catch(() => false)) {
        return true;
      }
      
      const url = page.url();
      return !url.includes('/login') && !url.includes('/signin');
    } catch (error) {
      console.warn(`[SCRAPER][PRIZEPICKS] Error checking login status:`, error);
      return false;
    }
  }

  protected async scrapeProps(): Promise<ScrapedProp[]> {
    if (!this.page) throw new Error('Page not initialized');

    console.log(`[SCRAPER][PRIZEPICKS] Waiting for prop cards to render...`);
    await this.page.waitForTimeout(5000); // Give React time to render

    // Wait for prop cards container
    try {
      await this.page.waitForSelector('div[data-testid="projection-card"]', { timeout: 10000 });
    } catch (error) {
      console.warn(`[SCRAPER][PRIZEPICKS] Prop cards not found with exact selector, trying alternatives...`);
    }

    const props: ScrapedProp[] = [];
    let previousCount = 0;
    let stableCount = 0;
    const maxScrolls = 50;

    // Infinite scroll until count stabilizes twice
    for (let i = 0; i < maxScrolls; i++) {
      // Get current prop cards
      const cards = await this.page.locator('div[data-testid="projection-card"]').all();
      const currentCount = cards.length;

      console.log(`[SCRAPER][PRIZEPICKS] Scroll ${i + 1}: Found ${currentCount} prop cards`);

      // Check if count stabilized
      if (currentCount === previousCount) {
        stableCount++;
        if (stableCount >= 2) {
          console.log(`[SCRAPER][PRIZEPICKS] Prop count stabilized at ${currentCount} (2 consecutive stable counts), stopping scroll`);
          break;
        }
      } else {
        stableCount = 0;
      }

      previousCount = currentCount;

      // Scroll to bottom
      await this.page.evaluate(() => {
        window.scrollTo(0, document.body.scrollHeight);
      });

      // Wait for new content to load
      await this.page.waitForTimeout(1000);
    }

    // Extract props from all cards
    const allCards = await this.page.locator('div[data-testid="projection-card"]').all();
    console.log(`[SCRAPER][PRIZEPICKS] Extracting data from ${allCards.length} prop cards...`);

    for (let i = 0; i < allCards.length; i++) {
      try {
        const card = allCards[i];

        // Extract player name
        const playerEl = card.locator('div[data-testid="player-name"]').first();
        const player = await playerEl.textContent();
        if (!player || !player.trim()) continue;

        // Extract stat name
        const statEl = card.locator('div[data-testid="stat-name"]').first();
        let stat = await statEl.textContent();
        if (!stat || !stat.trim()) continue;
        stat = normalizeStat(stat.trim());

        // Extract line (projection value)
        const lineEl = card.locator('span[data-testid="projection-value"]').first();
        const lineText = await lineEl.textContent();
        if (!lineText) continue;
        const line = parseFloat(lineText.replace(/[^\d.]/g, ''));
        if (isNaN(line)) continue;

        // Extract league (required for PrizePicks)
        const leagueEl = card.locator('span[data-testid="league"]').first();
        const leagueText = await leagueEl.textContent();
        if (!leagueText) continue;

        // Map league to sport
        let sport: string | null = null;
        const league = leagueText.trim().toUpperCase();
        if (league === 'NBA') sport = 'NBA';
        else if (league === 'NFL') sport = 'NFL';
        else if (league === 'NHL') sport = 'NHL';
        else if (league === 'MLB') sport = 'MLB';
        else {
          console.warn(`[SCRAPER][PRIZEPICKS] Unknown league: ${league}`);
          continue; // Skip if we can't determine sport
        }

        // Determine direction (PrizePicks typically shows both over/under, check which is selected)
        // If not clear from UI, default to 'over'
        let direction: 'over' | 'under' = 'over';
        try {
          const cardText = await card.textContent();
          if (cardText?.toLowerCase().includes('under')) {
            direction = 'under';
          }
        } catch {
          // Default to over
        }

        // Extract game time (if available)
        let gameTime: Date | null = null;
        try {
          const cardText = await card.textContent();
          const timeMatch = cardText?.match(/(\d{1,2}:\d{2}\s*(AM|PM)|Today|Tomorrow)/i);
          if (timeMatch) {
            gameTime = new Date(timeMatch[0]);
            if (isNaN(gameTime.getTime())) gameTime = null;
          }
        } catch {
          gameTime = null;
        }

        // Extract opponent (if available)
        let opponent: string | null = null;
        try {
          const cardText = await card.textContent();
          const opponentMatch = cardText?.match(/(?:vs|@)\s*([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/i);
          opponent = opponentMatch ? opponentMatch[1].trim() : null;
        } catch {
          opponent = null;
        }

        props.push({
          player: player.trim(),
          stat,
          line,
          direction,
          gameTime,
          opponent,
          team: null, // Not available in PrizePicks cards
          sport,
        });
      } catch (error) {
        console.warn(`[SCRAPER][PRIZEPICKS] Error extracting prop ${i}:`, error);
        continue;
      }
    }

    return props;
  }
}

