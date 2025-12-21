import { chromium, Browser, BrowserContext, Page } from 'playwright';
import * as fs from 'fs';
import * as path from 'path';

export interface BrowserConfig {
  headless: boolean;
  debug: boolean;
  storageDir: string;
  storageStateFile: string;
}

export interface DebugArtifacts {
  html: string;
  screenshot: Buffer;
  consoleLogs: string[];
  extractedItems: any[];
}

/**
 * Get browser configuration from environment variables
 */
export function getBrowserConfig(platform: string): BrowserConfig {
  const isProduction = process.env.RAILWAY_ENVIRONMENT === 'production' || process.env.NODE_ENV === 'production';
  const storageDir = process.env.SCRAPE_STORAGE_DIR || path.resolve(process.cwd(), '.storage');
  const storageStateFile = process.env[`${platform.toUpperCase()}_STORAGE_STATE`] || `${platform.toLowerCase()}.storage.json`;

  // Enforce headless mode in production
  const headless = isProduction ? true : (process.env.SCRAPE_HEADLESS === 'true');

  return {
    headless,
    debug: process.env.SCRAPE_DEBUG === 'true',
    storageDir,
    storageStateFile: path.join(storageDir, storageStateFile),
  };
}

/**
 * Ensure storage directory exists
 */
export function ensureStorageDir(storageDir: string): void {
  if (!fs.existsSync(storageDir)) {
    fs.mkdirSync(storageDir, { recursive: true });
    console.log(`[BROWSER] Created storage directory: ${storageDir}`);
  }
}

/**
 * Load storage state from file
 */
export function loadStorageState(storageStateFile: string): any | null {
  if (!fs.existsSync(storageStateFile)) {
    return null;
  }

  try {
    const data = fs.readFileSync(storageStateFile, 'utf-8');
    const state = JSON.parse(data);
    console.log(`[BROWSER] Loaded storage state from: ${storageStateFile}`);
    return state;
  } catch (error) {
    console.warn(`[BROWSER] Failed to load storage state:`, error);
    return null;
  }
}

/**
 * Save storage state to file
 */
export async function saveStorageState(context: BrowserContext, storageStateFile: string): Promise<void> {
  try {
    const state = await context.storageState();
    ensureStorageDir(path.dirname(storageStateFile));
    fs.writeFileSync(storageStateFile, JSON.stringify(state, null, 2));
    console.log(`[BROWSER] Saved storage state to: ${storageStateFile}`);
  } catch (error) {
    console.error(`[BROWSER] Failed to save storage state:`, error);
    throw error;
  }
}

/**
 * Verify Chromium is installed and accessible
 */
async function verifyChromiumInstalled(): Promise<void> {
  try {
    const { chromium: chromiumType } = await import('playwright');
    const executablePath = chromiumType.executablePath();
    
    if (!executablePath || !fs.existsSync(executablePath)) {
      throw new Error(`Chromium executable not found at: ${executablePath}`);
    }
    
    console.log(`[BROWSER] ✅ Chromium verified at: ${executablePath}`);
  } catch (error) {
    const err = error as Error;
    console.error('[BROWSER] ❌ Chromium verification failed:', err.message);
    console.error('[BROWSER] Please ensure Playwright browsers are installed:');
    console.error('[BROWSER]   Run: npx playwright install chromium --with-deps');
    throw new Error(`Chromium browser not available: ${err.message}`);
  }
}

/**
 * Create browser context with storage state
 */
export async function createBrowserContext(config: BrowserConfig): Promise<{ browser: Browser; context: BrowserContext }> {
  // Verify browser is installed before attempting to launch
  await verifyChromiumInstalled();
  
  ensureStorageDir(config.storageDir);

  console.log(`[BROWSER] Launching Chromium (headless: ${config.headless})...`);

  try {
    const browser = await chromium.launch({
      headless: config.headless,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });

    console.log('[BROWSER] ✅ Chromium browser launched successfully');

    const storageState = loadStorageState(config.storageStateFile);

    const context = await browser.newContext({
      storageState: storageState || undefined,
      viewport: { width: 1920, height: 1080 },
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    });

    return { browser, context };
  } catch (error) {
    const err = error as Error;
    console.error('[BROWSER] ❌ Failed to launch Chromium:', err.message);
    
    if (err.message.includes('Executable doesn\'t exist') || err.message.includes('chromium')) {
      console.error('[BROWSER] Browser executable not found. This usually means:');
      console.error('[BROWSER]   1. Playwright browsers were not installed during build');
      console.error('[BROWSER]   2. postinstall script failed silently');
      console.error('[BROWSER] Solution: Ensure package.json postinstall runs: npx playwright install chromium --with-deps');
    }
    
    throw err;
  }
}

/**
 * Save debug artifacts (HTML, screenshot, console logs, extracted items)
 */
export async function saveDebugArtifacts(
  page: Page,
  platform: string,
  extractedItems: any[],
  consoleLogs: string[],
  config: BrowserConfig
): Promise<string> {
  if (!config.debug) return '';

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const debugDir = path.join(config.storageDir, 'scrape_debug', platform, timestamp);
  fs.mkdirSync(debugDir, { recursive: true });

  // Save HTML
  const html = await page.content();
  fs.writeFileSync(path.join(debugDir, 'page.html'), html);

  // Save screenshot
  const screenshot = await page.screenshot({ fullPage: true });
  fs.writeFileSync(path.join(debugDir, 'screenshot.png'), screenshot);

  // Save console logs
  fs.writeFileSync(
    path.join(debugDir, 'console.log'),
    consoleLogs.join('\n')
  );

  // Save extracted items sample
  fs.writeFileSync(
    path.join(debugDir, 'extracted-items.json'),
    JSON.stringify(extractedItems.slice(0, 10), null, 2)
  );

  console.log(`[BROWSER][DEBUG] Saved debug artifacts to: ${debugDir}`);
  return debugDir;
}

/**
 * Capture console logs from page
 */
export function captureConsoleLogs(page: Page): string[] {
  const logs: string[] = [];
  
  page.on('console', (msg) => {
    const text = msg.text();
    logs.push(`[${msg.type()}] ${text}`);
  });

  page.on('pageerror', (error) => {
    logs.push(`[ERROR] ${error.message}`);
  });

  return logs;
}

