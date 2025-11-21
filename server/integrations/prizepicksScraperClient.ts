import puppeteer from "puppeteer-core";
import { globSync } from "glob";

interface PrizePicksProjection {
  id: string;
  attributes: {
    name?: string;
    team?: string;
    stat_type?: string;
    line_score?: number;
    start_time?: string;
    description?: string;
  };
  relationships?: {
    new_player?: {
      data?: {
        id: string;
      };
    };
  };
}

interface PrizePicksIncluded {
  id: string;
  type: string;
  attributes?: {
    name?: string;
    team?: string;
    position?: string;
  };
}

interface PrizePicksResponse {
  data: PrizePicksProjection[];
  included?: PrizePicksIncluded[];
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

class PrizePicksScraperClient {
  private browser: any = null;

  async initialize() {
    if (!this.browser) {
      // Find chromium executable in Nix store
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

  async getProjections(leagueId: number = 7): Promise<PrizePicksResponse> {
    try {
      await this.initialize();
      
      const page = await this.browser.newPage();
      
      // Set realistic headers
      await page.setUserAgent(
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      );
      
      await page.setExtraHTTPHeaders({
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept': 'application/json',
      });
      
      console.log(`🔍 Scraping PrizePicks for league ID ${leagueId}...`);
      
      let apiResponse: PrizePicksResponse | null = null;
      
      // Intercept API responses
      await page.setRequestInterception(true);
      
      page.on('request', (request: any) => {
        request.continue();
      });
      
      page.on('response', async (response: any) => {
        const url = response.url();
        
        // Look for the projections API endpoint
        if (url.includes('partner-api.prizepicks.com/projections') || 
            url.includes('api.prizepicks.com/projections')) {
          try {
            const contentType = response.headers()['content-type'];
            if (contentType && contentType.includes('application/json')) {
              const data = await response.json();
              console.log(`📦 Intercepted API response: ${Object.keys(data).join(', ')}`);
              
              if (data.data && Array.isArray(data.data)) {
                apiResponse = data as PrizePicksResponse;
                console.log(`✅ Found ${data.data.length} projections`);
              }
            }
          } catch (error) {
            console.error('Error parsing API response:', error);
          }
        }
      });
      
      // Navigate to PrizePicks board
      try {
        await page.goto('https://app.prizepicks.com/board', {
          waitUntil: 'networkidle2',
          timeout: 30000,
        });
        
        // Wait for content to load
        await page.waitForTimeout(5000);
        
      } catch (error) {
        console.error('Error navigating to PrizePicks:', error);
      }
      
      await page.close();
      
      if (apiResponse) {
        console.log(`✅ Successfully scraped ${apiResponse.data.length} projections from PrizePicks`);
        return apiResponse;
      } else {
        console.log('⚠️  No API data intercepted');
        return { data: [] };
      }
      
    } catch (error) {
      console.error('❌ PrizePicks scraping error:', error);
      return { data: [] };
    }
  }

  async close() {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }
  }

  normalizeToProps(response: PrizePicksResponse, sport: string): NormalizedProp[] {
    const props: NormalizedProp[] = [];
    
    // Create player lookup from included data
    const playerLookup = new Map<string, { name: string; team: string }>();
    if (response.included) {
      for (const item of response.included) {
        if (item.type === 'new_player' && item.attributes) {
          playerLookup.set(item.id, {
            name: item.attributes.name || 'Unknown',
            team: item.attributes.team || 'Unknown',
          });
        }
      }
    }
    
    for (const projection of response.data) {
      const playerId = projection.relationships?.new_player?.data?.id;
      const playerData = playerId ? playerLookup.get(playerId) : null;
      
      const player = playerData?.name || projection.attributes.name || 'Unknown';
      const team = playerData?.team || projection.attributes.team || 'Unknown';
      const stat = projection.attributes.stat_type || 'Unknown';
      const line = projection.attributes.line_score?.toString() || '0';
      const gameTime = projection.attributes.start_time 
        ? new Date(projection.attributes.start_time) 
        : new Date();
      const opponent = projection.attributes.description || 'TBD';
      
      // Create over prop
      props.push({
        player,
        team,
        opponent,
        stat,
        line,
        direction: 'over',
        platform: 'PrizePicks',
        gameTime,
        period: 'full_game',
      });
      
      // Create under prop
      props.push({
        player,
        team,
        opponent,
        stat,
        line,
        direction: 'under',
        platform: 'PrizePicks',
        gameTime,
        period: 'full_game',
      });
    }
    
    return props;
  }
}

export const prizepicksScraperClient = new PrizePicksScraperClient();
