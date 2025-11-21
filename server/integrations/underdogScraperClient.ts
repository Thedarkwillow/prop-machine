import puppeteer from "puppeteer-core";
import { globSync } from "glob";

interface UnderdogAppearance {
  id: string;
  attributes: {
    player_name?: string;
    team?: string;
    stat_type?: string;
    stat_value?: number;
    game_start_time?: string;
    opponent?: string;
  };
}

interface UnderdogResponse {
  appearances: UnderdogAppearance[];
}

interface NormalizedProp {
  player: string;
  team: string;
  opponent: string;
  stat: string;
  line: string;
  direction: 'over' | 'under';
  platform: string;
  gameTime: Date;
  period: string;
}

class UnderdogScraperClient {
  private browser: any = null;

  async initialize() {
    if (!this.browser) {
      const chromiumPaths = globSync('/nix/store/*chromium*/bin/chromium');
      const chromiumPath = chromiumPaths.length > 0 ? chromiumPaths[0] : 'chromium';
      
      console.log(`🌐 Initializing browser with: ${chromiumPath}`);
      
      this.browser = await puppeteer.launch({
        executablePath: chromiumPath,
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-accelerated-2d-canvas',
          '--no-first-run',
          '--no-zygote',
          '--disable-gpu',
          '--disable-blink-features=AutomationControlled',
        ],
      });
    }
  }

  async getAppearances(sport: string = 'NBA'): Promise<UnderdogResponse> {
    try {
      await this.initialize();
      
      const page = await this.browser.newPage();
      
      await page.setUserAgent(
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      );
      
      await page.setExtraHTTPHeaders({
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept': 'application/json',
      });
      
      console.log(`🔍 Scraping Underdog for ${sport}...`);
      
      let apiResponse: UnderdogResponse | null = null;
      
      await page.setRequestInterception(true);
      
      page.on('request', (request: any) => {
        request.continue();
      });
      
      page.on('response', async (response: any) => {
        const url = response.url();
        
        // Look for Underdog API endpoints
        if (url.includes('underdogfantasy.com') && 
            (url.includes('/appearances') || url.includes('/picks') || url.includes('/projections'))) {
          try {
            const contentType = response.headers()['content-type'];
            if (contentType && contentType.includes('application/json')) {
              const data = await response.json();
              console.log(`📦 Intercepted Underdog API response from: ${url}`);
              
              if (data.appearances && Array.isArray(data.appearances)) {
                apiResponse = { appearances: data.appearances };
                console.log(`✅ Found ${data.appearances.length} appearances`);
              } else if (Array.isArray(data)) {
                apiResponse = { appearances: data };
                console.log(`✅ Found ${data.length} appearances`);
              }
            }
          } catch (error) {
            console.error('Error parsing Underdog API response:', error);
          }
        }
      });
      
      // Navigate to Underdog pick'em
      try {
        await page.goto('https://underdogfantasy.com/pick-em', {
          waitUntil: 'networkidle2',
          timeout: 30000,
        });
        
        await page.waitForTimeout(5000);
        
      } catch (error) {
        console.error('Error navigating to Underdog:', error);
      }
      
      await page.close();
      
      if (apiResponse) {
        console.log(`✅ Successfully scraped ${apiResponse.appearances.length} appearances from Underdog`);
        return apiResponse;
      } else {
        console.log('⚠️  No Underdog API data intercepted');
        return { appearances: [] };
      }
      
    } catch (error) {
      console.error('❌ Underdog scraping error:', error);
      return { appearances: [] };
    }
  }

  async close() {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }
  }

  normalizeToProps(response: UnderdogResponse, sport: string): NormalizedProp[] {
    const props: NormalizedProp[] = [];
    
    for (const appearance of response.appearances) {
      const player = appearance.attributes.player_name || 'Unknown';
      const team = appearance.attributes.team || 'Unknown';
      const stat = appearance.attributes.stat_type || 'Unknown';
      const line = appearance.attributes.stat_value?.toString() || '0';
      const gameTime = appearance.attributes.game_start_time 
        ? new Date(appearance.attributes.game_start_time) 
        : new Date();
      const opponent = appearance.attributes.opponent || 'TBD';
      
      // Create higher prop
      props.push({
        player,
        team,
        opponent,
        stat,
        line,
        direction: 'over',
        platform: 'Underdog',
        gameTime,
        period: 'full_game',
      });
      
      // Create lower prop
      props.push({
        player,
        team,
        opponent,
        stat,
        line,
        direction: 'under',
        platform: 'Underdog',
        gameTime,
        period: 'full_game',
      });
    }
    
    return props;
  }
}

export const underdogScraperClient = new UnderdogScraperClient();
