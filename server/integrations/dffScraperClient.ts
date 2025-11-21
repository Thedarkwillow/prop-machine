/**
 * ⚠️ LEGAL WARNING ⚠️
 * 
 * This scraper is provided for EDUCATIONAL/TESTING PURPOSES ONLY.
 * 
 * RISKS:
 * - Violates DailyFantasyFuel Terms of Service
 * - May violate Computer Fraud and Abuse Act (CFAA)
 * - Could result in account termination, legal action
 * - Scraping paid content may constitute theft of service
 * 
 * REQUIREMENTS:
 * - You must have a valid DFF Premium subscription
 * - Use at your own legal risk
 * - Not intended for production use
 * 
 * MAINTENANCE:
 * - Breaks when DFF changes their HTML/CSS structure
 * - Requires constant updates and monitoring
 * - No stability guarantees
 * 
 * By using this code, you accept full legal liability.
 */

import puppeteer, { Browser, Page } from 'puppeteer-core';

export interface DFFProp {
  playerName: string;
  position: string;
  team: string;
  opponent: string;
  statType: string;
  line: number;
  direction: 'over' | 'under';
  percentToHit: number;
  l5HitRate: number;
  l10HitRate: number;
  seasonHitRate: number;
  sport: string;
  gameTime?: string;
}

export class DFFScraperClient {
  private browser: Browser | null = null;
  private email: string;
  private password: string;
  private baseUrl = 'https://www.dailyfantasyfuel.com';

  constructor(email: string, password: string) {
    if (!email || !password) {
      throw new Error('DFF credentials required. Set DFF_EMAIL and DFF_PASSWORD environment variables.');
    }
    this.email = email;
    this.password = password;
  }

  /**
   * Initialize browser instance
   */
  private async initBrowser(): Promise<Browser> {
    if (this.browser) {
      return this.browser;
    }

    console.log('🌐 Launching browser for DFF scraper...');
    
    this.browser = await puppeteer.launch({
      executablePath: '/usr/bin/chromium',
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
      ],
    });

    return this.browser;
  }

  /**
   * Login to DailyFantasyFuel
   */
  private async login(page: Page): Promise<void> {
    console.log('🔐 Logging in to DailyFantasyFuel...');

    await page.goto(`${this.baseUrl}/auth`, {
      waitUntil: 'networkidle2',
      timeout: 30000,
    });

    // Wait for login form
    await page.waitForSelector('input[type="email"]', { timeout: 10000 });

    // Fill in credentials
    await page.type('input[type="email"]', this.email);
    await page.type('input[type="password"]', this.password);

    // Click login button
    await page.click('button[type="submit"]');

    // Wait for redirect after login
    await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 15000 });

    console.log('✅ Successfully logged in to DFF');
  }

  /**
   * Scrape PrizePicks props for a specific sport
   */
  async scrapePrizePicks(sport: 'nfl' | 'nba' | 'mlb' | 'nhl'): Promise<DFFProp[]> {
    const browser = await this.initBrowser();
    const page = await browser.newPage();

    try {
      // Set user agent to avoid detection
      await page.setUserAgent(
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      );

      // Login
      await this.login(page);

      // Navigate to PrizePicks optimizer page
      const url = `${this.baseUrl}/prizepicks-optimizer/${sport}`;
      console.log(`📊 Navigating to ${url}...`);
      
      await page.goto(url, {
        waitUntil: 'networkidle2',
        timeout: 30000,
      });

      // Wait for props table to load
      await page.waitForSelector('table', { timeout: 15000 });

      // Extract props data
      const props = await page.evaluate((sportParam) => {
        const rows = document.querySelectorAll('table tbody tr');
        const results: DFFProp[] = [];

        rows.forEach((row) => {
          try {
            // Extract player info
            const playerNameEl = row.querySelector('[data-testid*="player-name"], .player-name, td:nth-child(2)');
            const positionEl = row.querySelector('[data-testid*="position"], .position');
            const teamEl = row.querySelector('[data-testid*="team"], .team, img[alt]');
            
            // Extract prop details
            const statTypeEl = row.querySelector('[data-testid*="stat-type"], .stat-type, td:nth-child(3)');
            const lineEl = row.querySelector('[data-testid*="line"], .line, td:nth-child(4)');
            
            // Extract hit rates
            const percentToHitEl = row.querySelector('[data-testid*="percent-hit"], .percent-hit, td:nth-child(5)');
            const l5HitRateEl = row.querySelector('[data-testid*="l5-hit"], .l5-hit');
            const l10HitRateEl = row.querySelector('[data-testid*="l10-hit"], .l10-hit');
            const seasonHitRateEl = row.querySelector('[data-testid*="season-hit"], .season-hit');

            if (!playerNameEl || !statTypeEl || !lineEl) {
              return;
            }

            const playerText = playerNameEl.textContent?.trim() || '';
            const statText = statTypeEl.textContent?.trim() || '';
            const lineText = lineEl.textContent?.trim() || '';

            // Parse direction and line from stat text (e.g., "Over 16.5 Rec Yards")
            const directionMatch = statText.match(/(Over|Under)\s+([\d.]+)\s+(.+)/i);
            if (!directionMatch) return;

            const [, direction, line, statType] = directionMatch;

            results.push({
              playerName: playerText,
              position: positionEl?.textContent?.trim() || '',
              team: teamEl?.getAttribute('alt') || teamEl?.textContent?.trim() || '',
              opponent: '',
              statType: statType.trim(),
              line: parseFloat(line),
              direction: direction.toLowerCase() as 'over' | 'under',
              percentToHit: parseFloat(percentToHitEl?.textContent?.replace('%', '') || '0'),
              l5HitRate: parseFloat(l5HitRateEl?.textContent?.replace('%', '') || '0'),
              l10HitRate: parseFloat(l10HitRateEl?.textContent?.replace('%', '') || '0'),
              seasonHitRate: parseFloat(seasonHitRateEl?.textContent?.replace('%', '') || '0'),
              sport: sportParam.toUpperCase(),
            });
          } catch (err) {
            console.error('Error parsing row:', err);
          }
        });

        return results;
      }, sport);

      console.log(`✅ Scraped ${props.length} PrizePicks props from DFF for ${sport.toUpperCase()}`);

      return props;
    } catch (error) {
      console.error(`❌ Error scraping DFF for ${sport}:`, error);
      throw error;
    } finally {
      await page.close();
    }
  }

  /**
   * Scrape all sports
   */
  async scrapeAllSports(): Promise<DFFProp[]> {
    const sports: Array<'nfl' | 'nba' | 'mlb' | 'nhl'> = ['nfl', 'nba', 'mlb', 'nhl'];
    const allProps: DFFProp[] = [];

    for (const sport of sports) {
      try {
        const props = await this.scrapePrizePicks(sport);
        allProps.push(...props);
      } catch (error) {
        console.error(`Failed to scrape ${sport}:`, error);
      }
    }

    return allProps;
  }

  /**
   * Close browser
   */
  async close(): Promise<void> {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
      console.log('🔒 Browser closed');
    }
  }
}
