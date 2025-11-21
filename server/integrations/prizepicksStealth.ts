import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import type { Browser, Page } from 'puppeteer-core';

// Add stealth plugin
puppeteer.use(StealthPlugin());

interface PrizePicksStealthResponse {
  data: any[];
  included: any[];
}

export class PrizePicksStealthScraper {
  private browser: Browser | null = null;
  private executablePath: string;

  constructor() {
    // Use the correct chromium executable path for Replit
    this.executablePath = '/nix/store/zi4f80l169xlmivz8vja8wlphq74qqk0-chromium-125.0.6422.141/bin/chromium';
  }

  async initialize(): Promise<void> {
    if (this.browser) return;

    console.log('🤖 Initializing stealth browser for PrizePicks...');
    
    this.browser = await puppeteer.launch({
      executablePath: this.executablePath,
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--disable-gpu',
        '--window-size=1920x1080',
        '--disable-blink-features=AutomationControlled',
      ],
    });

    console.log('✅ Stealth browser initialized');
  }

  async scrapeProjections(sport: string = 'NBA'): Promise<PrizePicksStealthResponse> {
    await this.initialize();

    if (!this.browser) {
      throw new Error('Browser not initialized');
    }

    const page = await this.browser.newPage();

    try {
      // Set realistic viewport
      await page.setViewport({ width: 1920, height: 1080 });

      // Set extra headers
      await page.setExtraHTTPHeaders({
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept-Encoding': 'gzip, deflate, br',
      });

      // Intercept API calls
      let apiResponse: any = null;

      await page.setRequestInterception(true);
      
      page.on('request', (request) => {
        request.continue();
      });

      page.on('response', async (response) => {
        const url = response.url();
        
        // Capture the API response for projections
        if (url.includes('api.prizepicks.com/projections')) {
          try {
            const data = await response.json();
            apiResponse = data;
            console.log(`📦 Captured PrizePicks API response: ${data?.data?.length || 0} projections`);
          } catch (error) {
            console.error('Error parsing API response:', error);
          }
        }
      });

      console.log(`🌐 Navigating to PrizePicks ${sport} page...`);
      
      // Navigate to the PrizePicks site
      const sportPath = sport.toLowerCase();
      await page.goto(`https://app.prizepicks.com/board/${sportPath}`, {
        waitUntil: 'networkidle2',
        timeout: 30000,
      });

      console.log('⏳ Waiting for projections to load...');
      
      // Wait a bit for all API calls to complete (waitForTimeout is deprecated)
      await new Promise(resolve => setTimeout(resolve, 5000));

      if (apiResponse) {
        console.log(`✅ Successfully scraped ${apiResponse.data?.length || 0} projections via stealth browser`);
        return apiResponse;
      } else {
        throw new Error('No API response captured');
      }

    } catch (error) {
      console.error('❌ Stealth browser scraping failed:', error);
      throw error;
    } finally {
      await page.close();
    }
  }

  async close(): Promise<void> {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
      console.log('🔒 Stealth browser closed');
    }
  }
}

// Singleton instance
let stealthScraperInstance: PrizePicksStealthScraper | null = null;

export function getStealthScraper(): PrizePicksStealthScraper {
  if (!stealthScraperInstance) {
    stealthScraperInstance = new PrizePicksStealthScraper();
  }
  return stealthScraperInstance;
}
