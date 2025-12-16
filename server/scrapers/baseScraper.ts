import { chromium, Browser, BrowserContext, Page, Cookie } from 'playwright';
import * as fs from 'fs';
import * as path from 'path';
import * as readline from 'readline';

export interface ScraperConfig {
  platform: string;
  cookieFileName: string;
  loginUrl: string;
  headless?: boolean;
  slowMo?: number;
  timeout?: number;
}

export interface ScrapedProp {
  player: string;
  stat: string;
  line: number;
  direction: 'over' | 'under';
  gameTime: Date | null;
  opponent: string | null;
  team: string | null;
  sport: string | null;
}

export abstract class BaseScraper {
  protected browser: Browser | null = null;
  protected context: BrowserContext | null = null;
  protected page: Page | null = null;
  protected config: ScraperConfig;
  protected cookiesDir: string;

  constructor(config: ScraperConfig) {
    this.config = {
      headless: process.env.SCRAPER_HEADLESS === 'true' || process.env.RAILWAY_ENVIRONMENT === 'production',
      slowMo: parseInt(process.env.SCRAPER_SLOWMO || '0'),
      timeout: parseInt(process.env.SCRAPER_TIMEOUT_MS || '60000'),
      ...config,
    };
    this.cookiesDir = path.resolve(process.cwd(), 'cookies');
    if (!fs.existsSync(this.cookiesDir)) {
      fs.mkdirSync(this.cookiesDir, { recursive: true });
    }
  }

  /**
   * Load cookies from file
   */
  protected loadCookies(): Cookie[] | null {
    const cookiePath = path.join(this.cookiesDir, this.config.cookieFileName);
    if (!fs.existsSync(cookiePath)) {
      return null;
    }

    try {
      const cookieData = fs.readFileSync(cookiePath, 'utf-8');
      const cookies = JSON.parse(cookieData);
      if (Array.isArray(cookies) && cookies.length > 0 && cookies[0].name) {
        console.log(`[SCRAPER][${this.config.platform}] Loaded ${cookies.length} cookies from file`);
        return cookies;
      }
      return null;
    } catch (error) {
      console.warn(`[SCRAPER][${this.config.platform}] Failed to load cookies:`, error);
      return null;
    }
  }

  /**
   * Save cookies to file
   */
  protected async saveCookies(): Promise<void> {
    if (!this.context) return;
    
    try {
      const cookies = await this.context.cookies();
      const cookiePath = path.join(this.cookiesDir, this.config.cookieFileName);
      fs.writeFileSync(cookiePath, JSON.stringify(cookies, null, 2));
      console.log(`[SCRAPER][${this.config.platform}] Saved ${cookies.length} cookies to file`);
    } catch (error) {
      console.error(`[SCRAPER][${this.config.platform}] Failed to save cookies:`, error);
    }
  }

  /**
   * Check if user is logged in (platform-specific)
   */
  protected abstract isLoggedIn(page: Page): Promise<boolean>;

  /**
   * Prompt user to log in manually
   */
  protected promptLogin(): Promise<void> {
    return new Promise((resolve) => {
      const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
      });

      console.log(`\n[SCRAPER][${this.config.platform}] ⚠️  Authentication required`);
      console.log(`[SCRAPER][${this.config.platform}] Browser window will open. Please log in manually.`);
      console.log(`[SCRAPER][${this.config.platform}] Press ENTER once you have logged in...\n`);

      rl.question('', () => {
        rl.close();
        resolve();
      });
    });
  }

  /**
   * Initialize browser and authenticate
   */
  protected async initialize(): Promise<void> {
    console.log(`[SCRAPER][${this.config.platform}] Launching browser (headless: ${this.config.headless})...`);
    
    this.browser = await chromium.launch({
      headless: this.config.headless,
      slowMo: this.config.slowMo,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });

    this.context = await this.browser.newContext({
      viewport: { width: 1920, height: 1080 },
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    });

    // Load cookies if available
    const cookies = this.loadCookies();
    if (cookies) {
      await this.context.addCookies(cookies);
    }

    this.page = await this.context.newPage();
    this.page.setDefaultTimeout(this.config.timeout || 60000);

    // Navigate to login URL
    console.log(`[SCRAPER][${this.config.platform}] Navigating to ${this.config.loginUrl}...`);
    await this.page.goto(this.config.loginUrl, {
      waitUntil: 'networkidle',
      timeout: this.config.timeout,
    });

    // Check authentication
    if (!(await this.isLoggedIn(this.page))) {
      console.log(`[SCRAPER][${this.config.platform}] Not logged in, prompting for manual login...`);
      await this.promptLogin();
      
      // Re-check login
      if (!(await this.isLoggedIn(this.page))) {
        throw new Error('Login failed or not detected');
      }
      
      // Save cookies after login
      await this.saveCookies();
      console.log(`[SCRAPER][${this.config.platform}] Login successful, cookies saved`);
    } else {
      console.log(`[SCRAPER][${this.config.platform}] Already authenticated`);
    }
  }

  /**
   * Scrape props (platform-specific implementation)
   */
  protected abstract scrapeProps(): Promise<ScrapedProp[]>;

  /**
   * Main scrape method
   */
  async scrape(): Promise<ScrapedProp[]> {
    try {
      await this.initialize();
      const props = await this.scrapeProps();
      console.log(`[SCRAPER][${this.config.platform}] Scraped ${props.length} props`);
      return props;
    } catch (error) {
      const err = error as Error;
      console.error(`[SCRAPER][${this.config.platform}] ❌ Scraping failed:`, err);
      throw err;
    } finally {
      await this.cleanup();
    }
  }

  /**
   * Cleanup browser resources
   */
  protected async cleanup(): Promise<void> {
    if (this.page) {
      await this.page.close().catch(() => {});
      this.page = null;
    }
    if (this.context) {
      await this.context.close().catch(() => {});
      this.context = null;
    }
    if (this.browser) {
      await this.browser.close().catch(() => {});
      this.browser = null;
    }
    console.log(`[SCRAPER][${this.config.platform}] Browser closed`);
  }
}

