import { chromium, Browser, BrowserContext, Page, Cookie } from 'playwright';
import { storage } from '../storage.js';
import type { InsertProp } from '@shared/schema.js';
import { propAnalysisService } from '../services/propAnalysisService.js';
import { normalizeStat } from '../utils/statNormalizer.js';
import { resolveOpponent } from '../utils/opponentResolver.js';
import * as fs from 'fs';
import * as path from 'path';

interface ScrapedProp {
  platform: string;
  sport: string;
  player: string;
  stat: string;
  line: number;
  direction: 'over' | 'under';
  gameTime: Date | null;
  opponent: string | null;
  period: 'full_game' | '1Q' | '1H' | '2H' | '4Q' | null;
  team: string | null;
}

interface IngestionResult {
  fetched: number;
  upserted: number;
  updated: number;
  invalid: number;
  errors: string[];
  byPlatform: Record<string, { fetched: number; upserted: number; updated: number }>;
}

class BrowserIngestor {
  private browser: Browser | null = null;
  private cookiesDir: string;

  constructor() {
    // Ensure cookies directory exists
    this.cookiesDir = path.resolve(process.cwd(), 'cookies');
    if (!fs.existsSync(this.cookiesDir)) {
      fs.mkdirSync(this.cookiesDir, { recursive: true });
      console.log(`[BROWSER] Created cookies directory: ${this.cookiesDir}`);
    }
  }

  /**
   * Load cookies from file if present
   */
  private loadCookies(platform: string): Cookie[] | null {
    const cookiePath = path.join(this.cookiesDir, `${platform}.json`);
    if (!fs.existsSync(cookiePath)) {
      return null;
    }

    try {
      const cookieData = fs.readFileSync(cookiePath, 'utf-8');
      const cookies = JSON.parse(cookieData);
      // Validate cookie format
      if (Array.isArray(cookies) && cookies.length > 0 && cookies[0].name) {
        console.log(`[BROWSER] Loaded ${cookies.length} cookies for ${platform}`);
        return cookies;
      }
      return null;
    } catch (error) {
      console.warn(`[BROWSER] Failed to load cookies for ${platform}:`, error);
      return null;
    }
  }

  /**
   * Save cookies to file
   */
  private async saveCookies(context: BrowserContext, platform: string): Promise<void> {
    try {
      const cookies = await context.cookies();
      const cookiePath = path.join(this.cookiesDir, `${platform}.json`);
      fs.writeFileSync(cookiePath, JSON.stringify(cookies, null, 2));
      console.log(`[BROWSER] Saved ${cookies.length} cookies for ${platform}`);
    } catch (error) {
      console.error(`[BROWSER] Failed to save cookies for ${platform}:`, error);
    }
  }

  /**
   * Check if user is logged in by looking for auth indicators
   */
  private async isLoggedIn(page: Page, platform: string): Promise<boolean> {
    try {
      // Wait a bit for page to load
      await page.waitForTimeout(2000);

      if (platform === 'PrizePicks') {
        // Check for login button or user menu
        const loginButton = await page.locator('text=/sign in|log in|login/i').first();
        const userMenu = await page.locator('[data-testid*="user"], [class*="user"], [class*="profile"]').first();
        
        if (await loginButton.isVisible().catch(() => false)) {
          return false;
        }
        if (await userMenu.isVisible().catch(() => false)) {
          return true;
        }
        // If neither visible, check URL or page content
        const url = page.url();
        return !url.includes('/login') && !url.includes('/signin');
      } else if (platform === 'Underdog') {
        // Check for login indicators
        const loginButton = await page.locator('text=/sign in|log in|login/i').first();
        const userAvatar = await page.locator('[class*="avatar"], [class*="user"]').first();
        
        if (await loginButton.isVisible().catch(() => false)) {
          return false;
        }
        if (await userAvatar.isVisible().catch(() => false)) {
          return true;
        }
        const url = page.url();
        return !url.includes('/login') && !url.includes('/signin');
      }

      return false;
    } catch (error) {
      console.warn(`[BROWSER] Error checking login status for ${platform}:`, error);
      return false;
    }
  }

  /**
   * Prompt user to log in manually (non-headless mode)
   */
  private async promptLogin(page: Page, platform: string): Promise<boolean> {
    console.log(`\n[BROWSER] ⚠️  Authentication required for ${platform}`);
    console.log(`[BROWSER] Browser window will open. Please log in manually.`);
    console.log(`[BROWSER] Waiting for login... (check browser window)`);
    console.log(`[BROWSER] Press Enter in the terminal once you've logged in, or wait 5 minutes for timeout.\n`);

    // Wait for user to log in (check every 5 seconds)
    const maxWaitTime = 5 * 60 * 1000; // 5 minutes
    const checkInterval = 5000; // 5 seconds
    const startTime = Date.now();

    while (Date.now() - startTime < maxWaitTime) {
      await page.waitForTimeout(checkInterval);
      if (await this.isLoggedIn(page, platform)) {
        console.log(`[BROWSER] ✅ Login detected for ${platform}`);
        return true;
      }
    }

    console.error(`[BROWSER] ❌ Login timeout for ${platform}`);
    return false;
  }

  /**
   * Initialize browser context with authentication
   */
  private async getAuthenticatedContext(platform: string, headless: boolean = true): Promise<BrowserContext | null> {
    try {
      if (!this.browser) {
        console.log(`[BROWSER] Launching Chromium browser (headless: ${headless})...`);
        this.browser = await chromium.launch({
          headless,
          args: ['--no-sandbox', '--disable-setuid-sandbox'],
        });
      }

      const context = await this.browser.newContext({
        viewport: { width: 1920, height: 1080 },
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      });

      // Load cookies if available
      const cookies = this.loadCookies(platform);
      if (cookies) {
        await context.addCookies(cookies);
        console.log(`[BROWSER] Restored cookies for ${platform}`);
      }

      return context;
    } catch (error) {
      console.error(`[BROWSER] Failed to create browser context:`, error);
      return null;
    }
  }

  /**
   * Scrape PrizePicks board
   */
  private async scrapePrizePicks(sport: string): Promise<ScrapedProp[]> {
    const props: ScrapedProp[] = [];
    const context = await this.getAuthenticatedContext('PrizePicks', false); // Non-headless for login

    if (!context) {
      throw new Error('Failed to create browser context for PrizePicks');
    }

    const page = await context.newPage();

    try {
      console.log(`[BROWSER] Navigating to PrizePicks for ${sport}...`);
      await page.goto('https://app.prizepicks.com/', { waitUntil: 'networkidle', timeout: 30000 });

      // Check if logged in
      if (!(await this.isLoggedIn(page, 'PrizePicks'))) {
        console.log(`[BROWSER] Not logged in to PrizePicks, prompting for login...`);
        const loggedIn = await this.promptLogin(page, 'PrizePicks');
        if (!loggedIn) {
          throw new Error('Failed to authenticate with PrizePicks');
        }
        // Save cookies after login
        await this.saveCookies(context, 'PrizePicks');
      }

      // Navigate to sport-specific board
      const sportMap: Record<string, string> = {
        'NBA': 'basketball',
        'NFL': 'football',
        'NHL': 'hockey',
        'MLB': 'baseball',
      };

      const sportKey = sportMap[sport];
      if (!sportKey) {
        throw new Error(`Sport ${sport} not supported by PrizePicks scraper`);
      }

      // Wait for props to load
      await page.waitForTimeout(3000);

      // Scrape props from the page
      // PrizePicks structure: props are in cards/containers with player name, stat, line
      const propCards = await page.locator('[class*="card"], [class*="prop"], [data-testid*="prop"]').all();
      
      console.log(`[BROWSER] Found ${propCards.length} potential prop elements on PrizePicks`);

      for (const card of propCards.slice(0, 100)) { // Limit to first 100 to avoid timeout
        try {
          // Extract player name
          const playerElement = card.locator('text=/^[A-Z][a-z]+ [A-Z][a-z]+$/').first();
          const player = await playerElement.textContent().catch(() => null);
          if (!player) continue;

          // Extract stat
          const statElement = card.locator('[class*="stat"], [class*="metric"]').first();
          let stat = await statElement.textContent().catch(() => null);
          if (!stat) {
            // Try alternative selectors
            stat = await card.locator('text=/points|rebounds|assists|goals|yards|tds/i').first().textContent().catch(() => null);
          }
          if (!stat) continue;
          stat = normalizeStat(stat.trim());

          // Extract line
          const lineElement = card.locator('[class*="line"], [class*="number"]').first();
          const lineText = await lineElement.textContent().catch(() => null);
          if (!lineText) continue;
          const line = parseFloat(lineText.replace(/[^\d.]/g, ''));
          if (isNaN(line)) continue;

          // Extract direction (over/under)
          const directionText = await card.locator('text=/over|under/i').first().textContent().catch(() => null);
          const direction: 'over' | 'under' = directionText?.toLowerCase().includes('over') ? 'over' : 'under';

          // Extract game time (if available)
          const timeElement = card.locator('[class*="time"], [class*="date"]').first();
          const timeText = await timeElement.textContent().catch(() => null);
          let gameTime: Date | null = null;
          if (timeText) {
            try {
              gameTime = new Date(timeText);
              if (isNaN(gameTime.getTime())) gameTime = null;
            } catch {
              gameTime = null;
            }
          }

          // Extract opponent (if available)
          const opponentElement = card.locator('text=/vs|@/i').first();
          const opponentText = await opponentElement.textContent().catch(() => null);
          const opponent = opponentText ? opponentText.replace(/vs|@/gi, '').trim() : null;

          props.push({
            platform: 'PrizePicks',
            sport,
            player: player.trim(),
            stat,
            line,
            direction,
            gameTime,
            opponent,
            period: 'full_game',
            team: null,
          });
        } catch (error) {
          // Skip invalid cards
          continue;
        }
      }

      console.log(`[BROWSER] Scraped ${props.length} props from PrizePicks for ${sport}`);
    } catch (error) {
      console.error(`[BROWSER] Error scraping PrizePicks:`, error);
      throw error;
    } finally {
      await page.close();
      // Don't close context - we might reuse it
    }

    return props;
  }

  /**
   * Scrape Underdog Pick'em board
   */
  private async scrapeUnderdog(sport: string): Promise<ScrapedProp[]> {
    const props: ScrapedProp[] = [];
    const context = await this.getAuthenticatedContext('Underdog', false); // Non-headless for login

    if (!context) {
      throw new Error('Failed to create browser context for Underdog');
    }

    const page = await context.newPage();

    try {
      console.log(`[BROWSER] Navigating to Underdog for ${sport}...`);
      await page.goto('https://underdogfantasy.com/pick-em', { waitUntil: 'networkidle', timeout: 30000 });

      // Check if logged in
      if (!(await this.isLoggedIn(page, 'Underdog'))) {
        console.log(`[BROWSER] Not logged in to Underdog, prompting for login...`);
        const loggedIn = await this.promptLogin(page, 'Underdog');
        if (!loggedIn) {
          throw new Error('Failed to authenticate with Underdog');
        }
        // Save cookies after login
        await this.saveCookies(context, 'Underdog');
      }

      // Filter by sport if possible
      const sportMap: Record<string, string> = {
        'NBA': 'NBA',
        'NFL': 'NFL',
        'NHL': 'NHL',
        'MLB': 'MLB',
      };

      const sportFilter = sportMap[sport];
      if (sportFilter) {
        // Try to click sport filter
        try {
          const sportButton = page.locator(`text=/${sportFilter}/i`).first();
          if (await sportButton.isVisible().catch(() => false)) {
            await sportButton.click();
            await page.waitForTimeout(2000);
          }
        } catch {
          // Filter not available, continue
        }
      }

      // Wait for props to load
      await page.waitForTimeout(3000);

      // Scrape props from the page
      const propCards = await page.locator('[class*="card"], [class*="prop"], [data-testid*="prop"]').all();
      
      console.log(`[BROWSER] Found ${propCards.length} potential prop elements on Underdog`);

      for (const card of propCards.slice(0, 100)) { // Limit to first 100
        try {
          // Extract player name
          const playerElement = card.locator('text=/^[A-Z][a-z]+ [A-Z][a-z]+$/').first();
          const player = await playerElement.textContent().catch(() => null);
          if (!player) continue;

          // Extract stat
          const statElement = card.locator('[class*="stat"], [class*="metric"]').first();
          let stat = await statElement.textContent().catch(() => null);
          if (!stat) {
            stat = await card.locator('text=/points|rebounds|assists|goals|yards|tds/i').first().textContent().catch(() => null);
          }
          if (!stat) continue;
          stat = normalizeStat(stat.trim());

          // Extract line
          const lineElement = card.locator('[class*="line"], [class*="number"]').first();
          const lineText = await lineElement.textContent().catch(() => null);
          if (!lineText) continue;
          const line = parseFloat(lineText.replace(/[^\d.]/g, ''));
          if (isNaN(line)) continue;

          // Extract direction
          const directionText = await card.locator('text=/over|under/i').first().textContent().catch(() => null);
          const direction: 'over' | 'under' = directionText?.toLowerCase().includes('over') ? 'over' : 'under';

          // Extract game time
          const timeElement = card.locator('[class*="time"], [class*="date"]').first();
          const timeText = await timeElement.textContent().catch(() => null);
          let gameTime: Date | null = null;
          if (timeText) {
            try {
              gameTime = new Date(timeText);
              if (isNaN(gameTime.getTime())) gameTime = null;
            } catch {
              gameTime = null;
            }
          }

          // Extract opponent
          const opponentElement = card.locator('text=/vs|@/i').first();
          const opponentText = await opponentElement.textContent().catch(() => null);
          const opponent = opponentText ? opponentText.replace(/vs|@/gi, '').trim() : null;

          props.push({
            platform: 'Underdog',
            sport,
            player: player.trim(),
            stat,
            line,
            direction,
            gameTime,
            opponent,
            period: 'full_game',
            team: null,
          });
        } catch (error) {
          // Skip invalid cards
          continue;
        }
      }

      console.log(`[BROWSER] Scraped ${props.length} props from Underdog for ${sport}`);
    } catch (error) {
      console.error(`[BROWSER] Error scraping Underdog:`, error);
      throw error;
    } finally {
      await page.close();
    }

    return props;
  }

  /**
   * Convert scraped prop to InsertProp format
   */
  private async convertToInsertProp(scraped: ScrapedProp): Promise<InsertProp> {
    // Run ML analysis to get confidence scores
    let confidence = 50;
    let ev = "0";
    let modelProbability = "0.5";

    try {
      if (scraped.team && scraped.opponent) {
        const analysis = await propAnalysisService.analyzeProp({
          sport: scraped.sport,
          player: scraped.player,
          team: scraped.team,
          opponent: scraped.opponent,
          stat: scraped.stat,
          line: scraped.line.toString(),
          direction: scraped.direction,
          platform: scraped.platform,
        });
        confidence = analysis.confidence;
        ev = analysis.ev.toString();
        modelProbability = analysis.modelProbability.toString();
      }
    } catch (error) {
      console.warn(`[BROWSER] ML analysis failed for ${scraped.player}:`, error);
    }

    // Resolve opponent if missing
    let opponent = scraped.opponent || 'TBD';
    if (opponent === 'TBD' && scraped.team && scraped.gameTime) {
      const resolved = await resolveOpponent(scraped.team, scraped.sport, scraped.gameTime);
      if (resolved) {
        opponent = resolved;
      }
    }

    // DB-safe format (no externalId, updatedAt, isActive, raw)
    return {
      sport: scraped.sport,
      player: scraped.player,
      team: scraped.team || 'TBD',
      opponent,
      stat: scraped.stat,
      line: scraped.line.toString(),
      currentLine: scraped.line.toString(),
      direction: scraped.direction,
      period: scraped.period || 'full_game',
      platform: scraped.platform,
      fixtureId: null,
      marketId: null,
      gameTime: scraped.gameTime || new Date(),
      confidence,
      ev,
      modelProbability,
    };
  }

  /**
   * Ingest props from all platforms using browser scraping
   */
  async ingestAll(sports: string[] = ['NBA', 'NFL', 'NHL']): Promise<IngestionResult> {
    const result: IngestionResult = {
      fetched: 0,
      upserted: 0,
      updated: 0,
      invalid: 0,
      errors: [],
      byPlatform: {},
    };

    console.log('[BROWSER] Starting browser-based prop ingestion');
    console.log(`[BROWSER] Sports: ${sports.join(', ')}`);

    const allScraped: ScrapedProp[] = [];

    try {
      // Scrape from both platforms
      for (const sport of sports) {
        // PrizePicks
        try {
          console.log(`[BROWSER] Scraping PrizePicks for ${sport}...`);
          const prizePicksProps = await this.scrapePrizePicks(sport);
          allScraped.push(...prizePicksProps);
          
          if (!result.byPlatform['PrizePicks']) {
            result.byPlatform['PrizePicks'] = { fetched: 0, upserted: 0, updated: 0 };
          }
          result.byPlatform['PrizePicks'].fetched += prizePicksProps.length;
          console.log(`[BROWSER] PrizePicks ${sport}: ${prizePicksProps.length} props scraped`);
        } catch (error) {
          const err = error as Error;
          result.errors.push(`PrizePicks ${sport}: ${err.message}`);
          console.error(`[BROWSER] PrizePicks ${sport} error:`, err);
        }

        // Underdog
        try {
          console.log(`[BROWSER] Scraping Underdog for ${sport}...`);
          const underdogProps = await this.scrapeUnderdog(sport);
          allScraped.push(...underdogProps);
          
          if (!result.byPlatform['Underdog']) {
            result.byPlatform['Underdog'] = { fetched: 0, upserted: 0, updated: 0 };
          }
          result.byPlatform['Underdog'].fetched += underdogProps.length;
          console.log(`[BROWSER] Underdog ${sport}: ${underdogProps.length} props scraped`);
        } catch (error) {
          const err = error as Error;
          result.errors.push(`Underdog ${sport}: ${err.message}`);
          console.error(`[BROWSER] Underdog ${sport} error:`, err);
        }
      }

      result.fetched = allScraped.length;
      console.log(`[BROWSER] Total scraped props: ${result.fetched}`);

      if (allScraped.length === 0) {
        console.warn(`[BROWSER] ⚠️  No props scraped from any platform`);
        return result;
      }

      // Convert to InsertProp and upsert to database
      console.log(`[BROWSER] Converting and upserting ${allScraped.length} props to database...`);

      const batchSize = 50;
      for (let i = 0; i < allScraped.length; i += batchSize) {
        const batch = allScraped.slice(i, i + batchSize);
        const insertProps: InsertProp[] = [];

        for (const scraped of batch) {
          try {
            const insertProp = await this.convertToInsertProp(scraped);
            insertProps.push(insertProp);
          } catch (error) {
            result.invalid++;
            const err = error as Error;
            if (result.errors.length < 20) {
              result.errors.push(`${scraped.platform} ${scraped.player}: ${err.message}`);
            }
          }
        }

        if (insertProps.length > 0) {
          try {
            const upsertResult = await storage.upsertProps(insertProps);
            result.upserted += upsertResult.inserted;
            result.updated += upsertResult.updated;

            // Update platform stats
            for (const prop of insertProps) {
              const platform = prop.platform;
              if (result.byPlatform[platform]) {
                // Approximate distribution
                const platformProps = insertProps.filter(p => p.platform === platform).length;
                const totalOps = upsertResult.inserted + upsertResult.updated;
                if (totalOps > 0) {
                  const opsPerProp = totalOps / insertProps.length;
                  result.byPlatform[platform].upserted += Math.round(platformProps * (upsertResult.inserted / insertProps.length));
                  result.byPlatform[platform].updated += Math.round(platformProps * (upsertResult.updated / insertProps.length));
                }
              }
            }

            console.log(`[BROWSER] Batch ${Math.floor(i / batchSize) + 1}: ${upsertResult.inserted} inserted, ${upsertResult.updated} updated`);
          } catch (error) {
            const err = error as Error;
            result.errors.push(`Batch ${Math.floor(i / batchSize) + 1}: ${err.message}`);
            console.error(`[BROWSER] Batch upsert error:`, err);
          }
        }
      }

      // Final summary
      console.log(`[BROWSER] ✅ Ingestion completed: ${result.fetched} scraped, ${result.upserted} inserted, ${result.updated} updated`);
      for (const [platform, stats] of Object.entries(result.byPlatform)) {
        console.log(`[BROWSER] ${platform}: ${stats.fetched} scraped, ${stats.upserted} inserted, ${stats.updated} updated`);
      }

    } finally {
      // Cleanup browser
      if (this.browser) {
        await this.browser.close();
        this.browser = null;
        console.log(`[BROWSER] Browser closed`);
      }
    }

    return result;
  }
}

export const browserIngestor = new BrowserIngestor();

