import { chromium, Browser, BrowserContext, Page, Cookie } from 'playwright';
import { db } from '../db.js';
import { props } from '@shared/schema.js';
import { eq } from 'drizzle-orm';
import type { InsertProp } from '@shared/schema.js';
import { normalizeStat } from '../utils/statNormalizer.js';
import { resolveOpponent } from '../utils/opponentResolver.js';
import * as fs from 'fs';
import * as path from 'path';
import * as readline from 'readline';

interface ScrapedPrizePicksProp {
  player: string;
  stat: string;
  line: number;
  direction: 'over' | 'under';
  gameTime: Date | null;
  opponent: string | null;
  team: string | null;
  sport: string;
}

export interface PrizePicksIngestionResult {
  scraped: number;
  inserted: number;
  errors: string[];
}

/**
 * Load cookies from file
 */
function loadCookies(): Cookie[] | null {
  const cookiePath = path.resolve(process.cwd(), 'cookies', 'prizepicks.json');
  if (!fs.existsSync(cookiePath)) {
    return null;
  }

  try {
    const cookieData = fs.readFileSync(cookiePath, 'utf-8');
    const cookies = JSON.parse(cookieData);
    if (Array.isArray(cookies) && cookies.length > 0 && cookies[0].name) {
      console.log(`[PRIZEPICKS] Loaded ${cookies.length} cookies from file`);
      return cookies;
    }
    return null;
  } catch (error) {
    console.warn(`[PRIZEPICKS] Failed to load cookies:`, error);
    return null;
  }
}

/**
 * Save cookies to file
 */
async function saveCookies(context: BrowserContext): Promise<void> {
  try {
    const cookies = await context.cookies();
    const cookieDir = path.resolve(process.cwd(), 'cookies');
    if (!fs.existsSync(cookieDir)) {
      fs.mkdirSync(cookieDir, { recursive: true });
    }
    const cookiePath = path.join(cookieDir, 'prizepicks.json');
    fs.writeFileSync(cookiePath, JSON.stringify(cookies, null, 2));
    console.log(`[PRIZEPICKS] Saved ${cookies.length} cookies to file`);
  } catch (error) {
    console.error(`[PRIZEPICKS] Failed to save cookies:`, error);
  }
}

/**
 * Check if user is logged in
 */
async function isLoggedIn(page: Page): Promise<boolean> {
  try {
    await page.waitForTimeout(2000);
    
    // Check for login indicators
    const loginButton = page.locator('text=/sign in|log in|login/i').first();
    const userMenu = page.locator('[data-testid*="user"], [class*="user"], [class*="profile"]').first();
    
    if (await loginButton.isVisible().catch(() => false)) {
      return false;
    }
    if (await userMenu.isVisible().catch(() => false)) {
      return true;
    }
    
    // Check URL
    const url = page.url();
    return !url.includes('/login') && !url.includes('/signin');
  } catch (error) {
    console.warn(`[PRIZEPICKS] Error checking login status:`, error);
    return false;
  }
}

/**
 * Prompt user to log in manually
 */
function promptLogin(): Promise<void> {
  return new Promise((resolve) => {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    console.log('\n[PRIZEPICKS] ⚠️  Authentication required');
    console.log('[PRIZEPICKS] Browser window will open. Please log in manually.');
    console.log('[PRIZEPICKS] Press ENTER once you have logged in...\n');

    rl.question('', () => {
      rl.close();
      resolve();
    });
  });
}

/**
 * Extract sport/league from page
 */
function detectSport(page: Page, card: any): string {
  // Try to detect from URL or page content
  const url = page.url();
  if (url.includes('nba') || url.includes('basketball')) return 'NBA';
  if (url.includes('nfl') || url.includes('football')) return 'NFL';
  if (url.includes('nhl') || url.includes('hockey')) return 'NHL';
  if (url.includes('mlb') || url.includes('baseball')) return 'MLB';

  // Try to extract from card text
  const cardText = card.textContent?.toLowerCase() || '';
  if (cardText.includes('nba') || cardText.includes('basketball')) return 'NBA';
  if (cardText.includes('nfl') || cardText.includes('football')) return 'NFL';
  if (cardText.includes('nhl') || cardText.includes('hockey')) return 'NHL';
  if (cardText.includes('mlb') || cardText.includes('baseball')) return 'MLB';

  // Default fallback
  return 'NBA';
}

/**
 * Scrape props from PrizePicks board
 */
export async function ingestPrizePicksProps(): Promise<PrizePicksIngestionResult> {
  const result: PrizePicksIngestionResult = {
    scraped: 0,
    inserted: 0,
    errors: [],
  };

  const headless = process.env.RAILWAY_ENVIRONMENT === 'production';
  console.log(`[PRIZEPICKS] Starting ingestion (headless: ${headless})`);

  let browser: Browser | null = null;
  let context: BrowserContext | null = null;
  let page: Page | null = null;

  try {
    // Launch browser
    console.log('[PRIZEPICKS] Launching browser...');
    browser = await chromium.launch({
      headless,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });

    context = await browser.newContext({
      viewport: { width: 1920, height: 1080 },
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    });

    // Load cookies if available
    const cookies = loadCookies();
    if (cookies) {
      await context.addCookies(cookies);
      console.log('[PRIZEPICKS] Restored cookies');
    }

    page = await context.newPage();

    // Navigate to PrizePicks
    console.log('[PRIZEPICKS] Navigating to https://app.prizepicks.com/...');
    await page.goto('https://app.prizepicks.com/', {
      waitUntil: 'networkidle',
      timeout: 30000,
    });

    // Check authentication
    if (!(await isLoggedIn(page))) {
      console.log('[PRIZEPICKS] Not logged in, prompting for manual login...');
      await promptLogin();
      
      // Re-check login
      if (!(await isLoggedIn(page))) {
        throw new Error('Login failed or not detected');
      }
      
      // Save cookies after login
      await saveCookies(context);
      console.log('[PRIZEPICKS] Login successful, cookies saved');
    } else {
      console.log('[PRIZEPICKS] Already authenticated');
    }

    // Wait for React to render prop cards
    console.log('[PRIZEPICKS] Waiting for prop cards to render...');
    await page.waitForTimeout(5000); // Give React time to render

    // Try multiple selector patterns for prop cards
    const cardSelectors = [
      'div[class*="projection"]',
      'div[data-testid*="projection"]',
      'div[class*="card"]',
      'div[class*="prop"]',
      '[class*="ProjectionCard"]',
      '[class*="Projection"]',
    ];

    let propCards: any[] = [];
    for (const selector of cardSelectors) {
      try {
        const cards = await page.locator(selector).all();
        if (cards.length > 0) {
          console.log(`[PRIZEPICKS] Found ${cards.length} cards using selector: ${selector}`);
          propCards = cards;
          break;
        }
      } catch (error) {
        // Try next selector
        continue;
      }
    }

    if (propCards.length === 0) {
      console.warn('[PRIZEPICKS] No prop cards found with any selector');
      // Take screenshot for debugging
      if (!headless) {
        await page.screenshot({ path: 'prizepicks-debug.png', fullPage: true });
        console.log('[PRIZEPICKS] Screenshot saved to prizepicks-debug.png');
      }
      return result;
    }

    console.log(`[PRIZEPICKS] Found ${propCards.length} potential prop cards, extracting data...`);

    const scrapedProps: ScrapedPrizePicksProp[] = [];

    // Extract props from each card
    for (let i = 0; i < Math.min(propCards.length, 200); i++) {
      try {
        const card = propCards[i];
        
        // Extract player name
        const playerSelectors = [
          'span',
          'div',
          '[class*="player"]',
          '[class*="name"]',
          'h1',
          'h2',
          'h3',
        ];
        
        let player: string | null = null;
        for (const sel of playerSelectors) {
          try {
            const playerEl = card.locator(sel).first();
            const text = await playerEl.textContent();
            if (text && text.trim().length > 0 && /^[A-Z][a-z]+ [A-Z]/.test(text.trim())) {
              player = text.trim();
              break;
            }
          } catch {
            continue;
          }
        }

        if (!player) continue;

        // Extract stat
        const statText = await card.textContent();
        const statMatch = statText?.match(/(Points|Rebounds|Assists|Goals|Shots|Yards|TDs|Touchdowns|Receptions|Passing Yards|Rushing Yards|Receiving Yards|Threes|Blocks|Steals)/i);
        let stat = statMatch ? statMatch[1] : null;
        if (!stat) continue;
        stat = normalizeStat(stat);

        // Extract line
        const lineMatch = statText?.match(/(\d+\.?\d*)/);
        const line = lineMatch ? parseFloat(lineMatch[1]) : null;
        if (!line || isNaN(line)) continue;

        // Extract direction
        const directionText = statText?.toLowerCase() || '';
        const direction: 'over' | 'under' = directionText.includes('over') ? 'over' : 'under';

        // Extract game time (if available)
        const timeMatch = statText?.match(/(\d{1,2}:\d{2}\s*(AM|PM)|Today|Tomorrow)/i);
        let gameTime: Date | null = null;
        if (timeMatch) {
          try {
            gameTime = new Date(timeMatch[0]);
            if (isNaN(gameTime.getTime())) gameTime = null;
          } catch {
            gameTime = null;
          }
        }

        // Extract opponent (if available)
        const opponentMatch = statText?.match(/(vs|@)\s*([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/i);
        const opponent = opponentMatch ? opponentMatch[2].trim() : null;

        // Detect sport/league (required for PrizePicks)
        const sport = detectSport(page, card);
        if (!sport) {
          result.errors.push(`Card ${i}: Could not detect sport/league`);
          continue;
        }

        scrapedProps.push({
          player: player.trim(),
          stat,
          line,
          direction,
          gameTime,
          opponent,
          team: null, // Will be resolved later if needed
          sport,
        });

        result.scraped++;
      } catch (error) {
        const err = error as Error;
        result.errors.push(`Card ${i}: ${err.message}`);
        continue;
      }
    }

    console.log(`[PRIZEPICKS] Scraped ${scrapedProps.length} props`);

    if (scrapedProps.length === 0) {
      console.warn('[PRIZEPICKS] ⚠️  Scraper returned 0 props — scraper may have failed');
      return result;
    }

    // Clear old PrizePicks props
    console.log('[PRIZEPICKS] Clearing old PrizePicks props from database...');
    await db.delete(props).where(eq(props.platform, 'PrizePicks'));
    console.log(`[PRIZEPICKS] Cleared old props`);

    // Normalize and insert props
    console.log('[PRIZEPICKS] Normalizing and inserting props...');
    const insertProps: InsertProp[] = [];

    for (const scraped of scrapedProps) {
      try {
        // Resolve opponent if missing
        let opponent = scraped.opponent || 'TBD';
        if (opponent === 'TBD' && scraped.team && scraped.gameTime) {
          const resolved = await resolveOpponent(scraped.team, scraped.sport, scraped.gameTime);
          if (resolved) {
            opponent = resolved;
          }
        }

        // Basic confidence (can be enhanced with ML later)
        const confidence = 50;
        const ev = "0";
        const modelProbability = "0.5";

        insertProps.push({
          sport: scraped.sport,
          player: scraped.player,
          team: scraped.team || 'TBD',
          opponent,
          stat: scraped.stat,
          line: scraped.line.toString(),
          currentLine: scraped.line.toString(),
          direction: scraped.direction,
          period: 'full_game',
          platform: 'PrizePicks',
          fixtureId: null,
          marketId: null,
          gameTime: scraped.gameTime || new Date(),
          confidence,
          ev,
          modelProbability,
        });
      } catch (error) {
        const err = error as Error;
        result.errors.push(`Normalization error for ${scraped.player}: ${err.message}`);
      }
    }

    if (insertProps.length > 0) {
      // Bulk insert
      console.log(`[PRIZEPICKS] Inserting ${insertProps.length} props into database...`);
      await db.insert(props).values(insertProps);
      result.inserted = insertProps.length;
      console.log(`[PRIZEPICKS] ✅ Successfully inserted ${result.inserted} props`);
    } else {
      console.warn('[PRIZEPICKS] ⚠️  No props to insert after normalization');
    }

  } catch (error) {
    const err = error as Error;
    console.error(`[PRIZEPICKS] ❌ Ingestion failed:`, err);
    result.errors.push(`Ingestion failed: ${err.message}`);
  } finally {
    if (page) await page.close().catch(() => {});
    if (context) await context.close().catch(() => {});
    if (browser) await browser.close().catch(() => {});
    console.log('[PRIZEPICKS] Browser closed');
  }

  // Final summary
  console.log(`[PRIZEPICKS] ========================================`);
  console.log(`[PRIZEPICKS] Ingestion Summary:`);
  console.log(`[PRIZEPICKS]   - Props scraped: ${result.scraped}`);
  console.log(`[PRIZEPICKS]   - Props inserted: ${result.inserted}`);
  console.log(`[PRIZEPICKS]   - Errors: ${result.errors.length}`);
  if (result.errors.length > 0 && result.errors.length <= 5) {
    result.errors.forEach(err => console.log(`[PRIZEPICKS]     - ${err}`));
  } else if (result.errors.length > 5) {
    console.log(`[PRIZEPICKS]     - ${result.errors.slice(0, 3).join('; ')}... (${result.errors.length} total)`);
  }
  console.log(`[PRIZEPICKS] ========================================`);

  return result;
}

