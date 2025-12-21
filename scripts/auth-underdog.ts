import { chromium, Browser, BrowserContext } from 'playwright';
import * as fs from 'fs';
import * as path from 'path';
import * as readline from 'readline';

const UNDERDOG_URL = 'https://underdogfantasy.com/pick-em';
const STORAGE_DIR = process.env.SCRAPE_STORAGE_DIR || path.resolve(process.cwd(), '.storage');
const STORAGE_FILE = path.join(STORAGE_DIR, 'underdog.storage.json');

async function main() {
  console.log('========================================');
  console.log('Underdog Authentication Script');
  console.log('========================================\n');
  console.log(`Storage file: ${STORAGE_FILE}`);
  console.log('\nA headed browser will open. Please log in to Underdog Fantasy.');
  console.log('Press ENTER once you have logged in...\n');

  // Ensure storage directory exists
  if (!fs.existsSync(STORAGE_DIR)) {
    fs.mkdirSync(STORAGE_DIR, { recursive: true });
  }

  // Launch headed browser
  const browser = await chromium.launch({
    headless: false,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
  });

  const page = await context.newPage();
  await page.goto(UNDERDOG_URL, { waitUntil: 'networkidle' });

  // Wait for user to press ENTER
  await new Promise<void>((resolve) => {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    rl.question('Press ENTER after logging in...', () => {
      rl.close();
      resolve();
    });
  });

  // Save storage state
  try {
    const state = await context.storageState();
    fs.writeFileSync(STORAGE_FILE, JSON.stringify(state, null, 2));
    console.log(`\n✅ Authentication state saved to: ${STORAGE_FILE}`);
    console.log('\nYou can now use this file in production by setting:');
    console.log(`  SCRAPE_STORAGE_DIR=${STORAGE_DIR}`);
    console.log('  UNDERDOG_STORAGE_STATE=underdog.storage.json');
  } catch (error) {
    console.error('❌ Failed to save storage state:', error);
    process.exit(1);
  } finally {
    await browser.close();
  }
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});

