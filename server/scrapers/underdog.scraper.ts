import { Page } from 'playwright';
import { BaseScraper, ScrapedProp } from './baseScraper.js';
import { normalizeStat } from '../utils/statNormalizer.js';

export class UnderdogScraper extends BaseScraper {
  constructor() {
    super({
      platform: 'UNDERDOG',
      cookieFileName: 'underdog.json',
      loginUrl: 'https://underdogfantasy.com/pick-em',
    });
  }

  protected async isLoggedIn(page: Page): Promise<boolean> {
    try {
      await page.waitForTimeout(2000);
      
      const loginButton = page.locator('text=/sign in|log in|login/i').first();
      const userAvatar = page.locator('[class*="avatar"], [class*="user"], [class*="profile"]').first();
      
      if (await loginButton.isVisible().catch(() => false)) {
        return false;
      }
      if (await userAvatar.isVisible().catch(() => false)) {
        return true;
      }
      
      const url = page.url();
      return !url.includes('/login') && !url.includes('/signin');
    } catch (error) {
      console.warn(`[SCRAPER][UNDERDOG] Error checking login status:`, error);
      return false;
    }
  }

  protected async scrapeProps(): Promise<ScrapedProp[]> {
    if (!this.page) throw new Error('Page not initialized');

    console.log(`[SCRAPER][UNDERDOG] Waiting for prop cards to render...`);
    await this.page.waitForTimeout(3000);

    // Wait for prop cards container
    try {
      await this.page.waitForSelector('div[data-testid="pick-em-prop"]', { timeout: 10000 });
    } catch (error) {
      console.warn(`[SCRAPER][UNDERDOG] Prop cards not found with exact selector, trying alternatives...`);
    }

    const props: ScrapedProp[] = [];
    let previousCount = 0;
    let stableCount = 0;
    const maxScrolls = 50;

    // Scroll to load all props
    for (let i = 0; i < maxScrolls; i++) {
      // Get current prop cards
      const cards = await this.page.locator('div[data-testid="pick-em-prop"]').all();
      const currentCount = cards.length;

      console.log(`[SCRAPER][UNDERDOG] Scroll ${i + 1}: Found ${currentCount} prop cards`);

      // Check if count stabilized
      if (currentCount === previousCount) {
        stableCount++;
        if (stableCount >= 2) {
          console.log(`[SCRAPER][UNDERDOG] Prop count stabilized at ${currentCount}, stopping scroll`);
          break;
        }
      } else {
        stableCount = 0;
      }

      previousCount = currentCount;

      // Scroll down
      await this.page.evaluate(() => {
        window.scrollBy(0, window.innerHeight);
      });

      // Wait for new content to load
      await this.page.waitForTimeout(750);
    }

    // Extract props from all cards
    const allCards = await this.page.locator('div[data-testid="pick-em-prop"]').all();
    console.log(`[SCRAPER][UNDERDOG] Extracting data from ${allCards.length} prop cards...`);

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

        // Extract direction (check which button is selected/active)
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
          // Fallback: check button classes or text
          const overClasses = await overButton.getAttribute('class').catch(() => '');
          const underClasses = await underButton.getAttribute('class').catch(() => '');
          if (underClasses?.includes('active') || underClasses?.includes('selected')) {
            direction = 'under';
          }
        }

        // Extract game time
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

        // Extract opponent (if available in card text)
        let opponent: string | null = null;
        try {
          const cardText = await card.textContent();
          const opponentMatch = cardText?.match(/(?:vs|@)\s*([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/i);
          opponent = opponentMatch ? opponentMatch[1].trim() : null;
        } catch {
          opponent = null;
        }

        // Detect sport from page context
        const pageText = await this.page!.textContent();
        let sport: string | null = null;
        if (pageText?.includes('NBA') || pageText?.includes('basketball')) sport = 'NBA';
        else if (pageText?.includes('NFL') || pageText?.includes('football')) sport = 'NFL';
        else if (pageText?.includes('NHL') || pageText?.includes('hockey')) sport = 'NHL';
        else if (pageText?.includes('MLB') || pageText?.includes('baseball')) sport = 'MLB';

        props.push({
          player: player.trim(),
          stat,
          line,
          direction,
          gameTime,
          opponent,
          team: null, // Not available in Underdog cards
          sport,
        });
      } catch (error) {
        console.warn(`[SCRAPER][UNDERDOG] Error extracting prop ${i}:`, error);
        continue;
      }
    }

    return props;
  }
}

