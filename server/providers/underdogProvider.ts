import { underdogClient } from "../integrations/underdogClient.js";
import { normalizeStat } from "../utils/statNormalizer.js";
import type { NormalizedProp } from "./prizepicksProvider.js";

export class UnderdogProvider {
  async fetchProps(sport: string): Promise<NormalizedProp[]> {
    console.log(`[UNDERDOG PROVIDER] Fetching props for ${sport}...`);

    let response;
    try {
      response = await underdogClient.getAppearances(sport);
    } catch (error) {
      const err = error as Error;
      console.error(`[UNDERDOG PROVIDER] Error fetching ${sport}:`, err.message);
      return [];
    }

    if (!response.appearances || response.appearances.length === 0) {
      console.log(`[UNDERDOG PROVIDER] No appearances found for ${sport}`);
      return [];
    }

    console.log(`[UNDERDOG PROVIDER] Fetched ${response.appearances.length} raw appearances for ${sport}`);

    // Use existing normalizeToProps method
    const normalizedProps = underdogClient.normalizeToProps(response, sport);
    
    const normalized: NormalizedProp[] = [];

    for (const prop of normalizedProps) {
      try {
        // Generate external ID
        const externalId = `underdog_${prop.player}_${prop.stat}_${prop.line}_${prop.direction}_${prop.gameTime.toISOString().split('T')[0]}`;

        normalized.push({
          sport,
          platform: 'Underdog',
          externalId,
          playerName: prop.player,
          statType: normalizeStat(prop.stat),
          line: parseFloat(prop.line),
          gameTime: prop.gameTime,
          opponent: prop.opponent || null,
          team: prop.team || null,
          isActive: true,
          raw: prop,
        });
      } catch (error) {
        console.error(`[UNDERDOG PROVIDER] Error normalizing prop:`, error);
      }
    }

    console.log(`[UNDERDOG PROVIDER] Normalized ${normalized.length} props for ${sport}`);
    return normalized;
  }
}

export const underdogProvider = new UnderdogProvider();

