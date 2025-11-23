import { fileCache } from "../utils/fileCache";
import type { Prop } from "@shared/schema";

interface CachedProp extends Omit<Prop, 'id' | 'createdAt'> {
  // Props stored in cache don't have DB IDs
  // We'll generate synthetic IDs based on content hash
}

interface PropsCacheEntry {
  sport: string;
  platform: string;
  props: CachedProp[];
  cachedAt: string;
  ttl: number; // TTL in seconds
}

/**
 * Service for managing props in filesystem cache
 * Replaces database storage for props
 */
export class PropCacheService {
  private readonly namespace = 'props';
  private readonly defaultTTL = 3600; // 1 hour default TTL

  /**
   * Save props to cache for a specific sport and platform
   */
  async saveProps(
    sport: string,
    platform: string,
    props: CachedProp[],
    ttl: number = this.defaultTTL
  ): Promise<void> {
    try {
      const key = `${sport}_${platform}`;
      const cacheEntry: PropsCacheEntry = {
        sport,
        platform,
        props,
        cachedAt: new Date().toISOString(),
        ttl,
      };

      console.log(`[PROP CACHE] Saving ${props.length} props to cache: sport=${sport}, platform=${platform}`);
      await fileCache.setCache(this.namespace, key, cacheEntry, ttl);
      console.log(`[PROP CACHE] ✅ Successfully cached ${props.length} ${sport} props for ${platform}`);
    } catch (error) {
      console.error(`[PROP CACHE] ❌ Error saving props to cache:`, error);
      throw error;
    }
  }

  /**
   * Get props from cache for a specific sport and platform
   */
  async getProps(
    sport: string,
    platform: string
  ): Promise<CachedProp[]> {
    try {
      const key = `${sport}_${platform}`;
      const cached = await fileCache.getCache<PropsCacheEntry>(
        this.namespace,
        key,
        this.defaultTTL
      );

      if (!cached) {
        console.log(`[PROP CACHE] No cache found for ${sport}/${platform}`);
        return [];
      }

      console.log(`[PROP CACHE] ✅ Found ${cached.props.length} cached props for ${sport}/${platform}`);
      return cached.props;
    } catch (error) {
      console.error(`[PROP CACHE] ❌ Error reading props from cache:`, error);
      return [];
    }
  }

  /**
   * Get all props for a sport (across all platforms)
   */
  async getPropsBySport(sport: string): Promise<Prop[]> {
    try {
      const platforms = ['PrizePicks', 'Underdog', 'DraftKings', 'FanDuel', 'Caesars', 'BetMGM', 'PointsBet'];
      const allProps: Prop[] = [];

      for (const platform of platforms) {
        const props = await this.getProps(sport, platform);
        // Add synthetic IDs for frontend compatibility
        const propsWithIds = props.map((prop, index) => ({
          ...prop,
          id: this.generatePropId(sport, platform, prop, index),
          createdAt: new Date(prop.gameTime || Date.now()),
        })) as Prop[];
        allProps.push(...propsWithIds);
      }

      console.log(`[PROP CACHE] ✅ Retrieved ${allProps.length} total props for ${sport} across ${platforms.length} platforms`);
      return allProps;
    } catch (error) {
      console.error(`[PROP CACHE] ❌ Error getting props by sport:`, error);
      return [];
    }
  }

  /**
   * Get all props (across all sports and platforms)
   */
  async getAllProps(): Promise<Prop[]> {
    try {
      const sports = ['NBA', 'NFL', 'NHL'];
      const allProps: Prop[] = [];

      for (const sport of sports) {
        const sportProps = await this.getPropsBySport(sport);
        allProps.push(...sportProps);
      }

      console.log(`[PROP CACHE] ✅ Retrieved ${allProps.length} total props across all sports`);
      return allProps;
    } catch (error) {
      console.error(`[PROP CACHE] ❌ Error getting all props:`, error);
      return [];
    }
  }

  /**
   * Generate a synthetic ID for a prop based on its content
   * This ensures consistent IDs across cache reads
   */
  private generatePropId(
    sport: string,
    platform: string,
    prop: CachedProp,
    index: number
  ): number {
    // Create a hash from prop content
    const content = `${sport}_${platform}_${prop.player}_${prop.stat}_${prop.line}_${prop.direction}_${prop.gameTime}`;
    let hash = 0;
    for (let i = 0; i < content.length; i++) {
      const char = content.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    // Return positive integer (use absolute value and add index for uniqueness)
    return Math.abs(hash) + (index * 1000000);
  }

  /**
   * Clear cached props for a specific sport/platform
   */
  async clearProps(sport: string, platform: string): Promise<void> {
    try {
      const key = `${sport}_${platform}`;
      const filePath = fileCache.getCacheFilePath(this.namespace, key);
      const fs = await import('fs/promises');
      
      try {
        await fs.unlink(filePath);
        console.log(`[PROP CACHE] ✅ Cleared cache for ${sport}/${platform}`);
      } catch (error: any) {
        if (error.code !== 'ENOENT') {
          throw error;
        }
        // File doesn't exist, that's fine
      }
    } catch (error) {
      console.error(`[PROP CACHE] ❌ Error clearing props cache:`, error);
    }
  }
}

export const propCacheService = new PropCacheService();

