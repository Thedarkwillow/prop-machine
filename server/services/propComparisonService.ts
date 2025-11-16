import { storage } from "../storage";
import type { Prop } from "@shared/schema";

interface PropComparison {
  player: string;
  stat: string;
  bestLine: number;
  platforms: {
    platform: string;
    line: number;
    direction: string;
    confidence: number;
    ev: string;
    propId: number;
  }[];
  lineSpread: number;
  recommendation: string;
}

export class PropComparisonService {
  /**
   * Compare same prop across platforms
   */
  async comparePropsAcrossPlatforms(player: string, stat: string): Promise<PropComparison | null> {
    const allProps = await storage.getAllActiveProps();
    
    // Find all props for this player and stat
    const matchingProps = allProps.filter(
      p => p.player.toLowerCase() === player.toLowerCase() && 
           p.stat.toLowerCase() === stat.toLowerCase()
    );

    if (matchingProps.length === 0) {
      return null;
    }

    // Group by direction (over/under)
    const overProps = matchingProps.filter(p => p.direction === 'over');
    const underProps = matchingProps.filter(p => p.direction === 'under');

    // Use the direction with more options
    const propsToCompare = overProps.length >= underProps.length ? overProps : underProps;
    const direction = overProps.length >= underProps.length ? 'over' : 'under';

    if (propsToCompare.length === 0) {
      return null;
    }

    const platforms = propsToCompare.map(p => ({
      platform: p.platform,
      line: parseFloat(p.line),
      direction: p.direction,
      confidence: p.confidence,
      ev: p.ev,
      propId: p.id,
    }));

    // Sort by line (best line for over is lowest, for under is highest)
    platforms.sort((a, b) => 
      direction === 'over' ? a.line - b.line : b.line - a.line
    );

    const bestLine = platforms[0].line;
    const worstLine = platforms[platforms.length - 1].line;
    const lineSpread = Math.abs(bestLine - worstLine);

    // Recommendation logic
    let recommendation = '';
    if (lineSpread >= 1.0) {
      recommendation = `Significant ${lineSpread.toFixed(1)} point advantage on ${platforms[0].platform}`;
    } else if (lineSpread >= 0.5) {
      recommendation = `${platforms[0].platform} offers best value`;
    } else {
      recommendation = 'Lines are similar across platforms';
    }

    return {
      player: propsToCompare[0].player,
      stat: propsToCompare[0].stat,
      bestLine,
      platforms,
      lineSpread,
      recommendation,
    };
  }

  /**
   * Find arbitrage opportunities (rare but possible)
   */
  async findArbitrageOpportunities(): Promise<any[]> {
    const allProps = await storage.getAllActiveProps();
    const opportunities: any[] = [];

    // Group by player + stat
    const grouped = new Map<string, Prop[]>();
    
    for (const prop of allProps) {
      const key = `${prop.player}-${prop.stat}`;
      if (!grouped.has(key)) {
        grouped.set(key, []);
      }
      grouped.get(key)!.push(prop);
    }

    // Look for arbitrage opportunities
    for (const [key, props] of grouped.entries()) {
      const overProps = props.filter(p => p.direction === 'over');
      const underProps = props.filter(p => p.direction === 'under');

      if (overProps.length > 0 && underProps.length > 0) {
        // Find best over line (lowest) and best under line (highest)
        const bestOver = overProps.reduce((best, p) => 
          parseFloat(p.line) < parseFloat(best.line) ? p : best
        );
        const bestUnder = underProps.reduce((best, p) => 
          parseFloat(p.line) > parseFloat(best.line) ? p : best
        );

        // Check if there's an arbitrage window
        if (parseFloat(bestOver.line) > parseFloat(bestUnder.line)) {
          opportunities.push({
            player: bestOver.player,
            stat: bestOver.stat,
            overPlatform: bestOver.platform,
            overLine: bestOver.line,
            underPlatform: bestUnder.platform,
            underLine: bestUnder.line,
            window: parseFloat(bestOver.line) - parseFloat(bestUnder.line),
          });
        }
      }
    }

    return opportunities;
  }

  /**
   * Get best available lines for a player across all stats
   */
  async getBestLinesForPlayer(playerName: string) {
    const allProps = await storage.getAllActiveProps();
    const playerProps = allProps.filter(
      p => p.player.toLowerCase() === playerName.toLowerCase()
    );

    // Group by stat
    const bystat = new Map<string, Prop[]>();
    for (const prop of playerProps) {
      if (!bystat.has(prop.stat)) {
        bystat.set(prop.stat, []);
      }
      bystat.get(prop.stat)!.push(prop);
    }

    const results: any[] = [];
    for (const [stat, props] of bystat.entries()) {
      const comparison = await this.comparePropsAcrossPlatforms(playerName, stat);
      if (comparison) {
        results.push(comparison);
      }
    }

    return results;
  }
}

export const propComparisonService = new PropComparisonService();
