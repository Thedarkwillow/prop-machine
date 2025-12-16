import { prizePicksClient, ParsedPrizePick } from "../integrations/prizePicksClient.js";
import { resolveOpponent } from "../utils/opponentResolver.js";
import { normalizeStat } from "../utils/statNormalizer.js";

export interface NormalizedProp {
  sport: string;
  platform: 'PrizePicks' | 'Underdog' | string;
  externalId: string;
  playerName: string;
  statType: string;
  line: number;
  gameTime: Date | null;
  opponent: string | null;
  team: string | null;
  isActive: boolean;
  raw: any;
}

const LEAGUE_TO_SPORT: Record<string, string> = {
  'NHL': 'NHL',
  'NBA': 'NBA',
  'NFL': 'NFL',
  'MLB': 'MLB',
};

export class PrizePicksProvider {
  async fetchProps(sport: string): Promise<NormalizedProp[]> {
    console.log(`[PRIZEPICKS PROVIDER] Fetching props for ${sport}...`);
    
    const leagueIdMap: Record<string, string> = {
      'NBA': '7',
      'NFL': '9',
      'NHL': '3',
    };
    
    const leagueId = leagueIdMap[sport];
    if (!leagueId) {
      console.log(`[PRIZEPICKS PROVIDER] Sport ${sport} not supported`);
      return [];
    }

    let projections: ParsedPrizePick[] = [];
    let apiFailed = false;
    
    try {
      if (sport === 'NHL') {
        projections = await prizePicksClient.getNHLProjections();
      } else if (sport === 'NBA') {
        projections = await prizePicksClient.getNBAProjections();
      } else if (sport === 'NFL') {
        projections = await prizePicksClient.getNFLProjections();
      }
    } catch (error) {
      const err = error as Error;
      apiFailed = true;
      const isRateLimit = err.message.includes('429') || err.message.includes('rate limit');
      const isQuotaExceeded = err.message.includes('401') || err.message.includes('quota');
      
      if (isRateLimit || isQuotaExceeded) {
        console.warn(`[PRIZEPICKS PROVIDER] API ${isRateLimit ? 'rate limited' : 'quota exceeded'} for ${sport}. Will attempt to use cached data if available.`);
      } else {
        console.error(`[PRIZEPICKS PROVIDER] Error fetching ${sport}:`, err.message);
      }
      
      // Note: Cache fallback is handled at ingestion level
      // Returning empty array here - ingestion will check cache separately
      return [];
    }

    console.log(`[PRIZEPICKS PROVIDER] Fetched ${projections.length} raw projections for ${sport}`);

    const normalized: NormalizedProp[] = [];

    for (const projection of projections) {
      try {
        const gameTime = projection.startTime ? new Date(projection.startTime) : null;
        const team = projection.team || null;
        
        // Resolve opponent if team is available
        let opponent: string | null = null;
        if (team && gameTime) {
          const resolved = await resolveOpponent(team, sport, gameTime);
          opponent = resolved || null;
        }

        // Normalize stat type
        const normalizedStat = normalizeStat(projection.stat);

        // Generate external ID from projection data
        const externalId = `prizepicks_${projection.player}_${normalizedStat}_${projection.line}_${gameTime?.toISOString().split('T')[0] || 'unknown'}`;

        normalized.push({
          sport,
          platform: 'PrizePicks',
          externalId,
          playerName: projection.player,
          statType: normalizedStat,
          line: projection.line,
          gameTime,
          opponent,
          team,
          isActive: true,
          raw: projection,
        });
      } catch (error) {
        console.error(`[PRIZEPICKS PROVIDER] Error normalizing prop:`, error);
      }
    }

    console.log(`[PRIZEPICKS PROVIDER] Normalized ${normalized.length} props for ${sport}`);
    return normalized;
  }
}

export const prizePicksProvider = new PrizePicksProvider();

