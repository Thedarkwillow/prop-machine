import { chromium, Browser } from 'playwright';

/**
 * Launch Chromium browser with Railway-safe configuration
 * Headless mode controlled by PLAYWRIGHT_HEADLESS env var (defaults to true)
 */
export async function launchBrowser(): Promise<Browser> {
  const headless = process.env.PLAYWRIGHT_HEADLESS !== 'false';
  
  console.log(`[SCRAPER] Launching browser (headless: ${headless})...`);
  
  try {
    const browser = await chromium.launch({
      headless,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
      ],
    });

    console.log('[SCRAPER] ✅ Browser launched successfully');
    return browser;
  } catch (error) {
    const err = error as Error;
    console.error('[SCRAPER] ❌ Browser launch failed:', err.message);
    console.error('[SCRAPER] This usually means:');
    console.error('[SCRAPER]   1. Playwright browsers not installed (run: npx playwright install chromium)');
    console.error('[SCRAPER]   2. Missing system dependencies');
    console.error('[SCRAPER]   3. Insufficient permissions');
    throw new Error(`Failed to launch browser: ${err.message}`);
  }
}
