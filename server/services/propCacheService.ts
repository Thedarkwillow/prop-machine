import { fileCache } from "../utils/fileCache";
import type { Prop } from "@shared/schema";
import * as fs from 'fs/promises';
import * as path from 'path';

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
  corrupted?: boolean;
  lastRefreshFailed?: boolean;
  error?: string;
  stale?: boolean;
}

interface CacheMetadata {
  lastUpdated: string;
  count: number;
  sport: string;
  platform: string;
}

/**
 * Service for managing props in filesystem cache
 * Replaces database storage for props
 */
export class PropCacheService {
  private readonly namespace = 'props';
  private readonly defaultTTL = 3600; // 1 hour default TTL
  private readonly cacheDir: string;

  constructor() {
    this.cacheDir = path.join(process.cwd(), 'cache', this.namespace);
    // Auto-repair on startup if enabled
    if (process.env.CACHE_AUTO_REPAIR === "true") {
      this.repairCache().catch(err => {
        console.error("[PROP CACHE] Auto-repair failed on startup:", err);
      });
    }
  }

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
      // Always create directory
      await fs.mkdir(this.cacheDir, { recursive: true });

      const key = `${sport}_${platform}`;
      const now = new Date().toISOString();
      const cacheEntry: PropsCacheEntry = {
        sport,
        platform,
        props,
        cachedAt: now,
        ttl,
      };

      console.log(`[CACHE WRITE] ${sport}/${platform}: ${props.length} props saved`);
      console.log(`[PROP CACHE] Saving ${props.length} props to cache: sport=${sport}, platform=${platform}`);
      
      await fileCache.setCache(this.namespace, key, cacheEntry, ttl);
      
      // Write metadata file
      const metadata: CacheMetadata = {
        lastUpdated: now,
        count: props.length,
        sport,
        platform,
      };
      const metadataPath = path.join(this.cacheDir, `${key}_metadata.json`);
      await fs.writeFile(metadataPath, JSON.stringify(metadata, null, 2), 'utf-8');
      
      console.log(`[PROP CACHE] ✅ Successfully cached ${props.length} ${sport} props for ${platform}`);
    } catch (error) {
      console.error(`[PROP CACHE] ❌ Error saving props to cache:`, error);
      throw error;
    }
  }

  /**
   * Get props from cache for a specific sport and platform
   * Includes corruption detection and TTL enforcement
   */
  async getProps(
    sport: string,
    platform: string
  ): Promise<CachedProp[] | { stale: boolean }> {
    try {
      const key = `${sport}_${platform}`;
      const filePath = fileCache.getCacheFilePath(this.namespace, key);

      // Check if file exists
      try {
        await fs.access(filePath);
      } catch {
        console.log(`[PROP CACHE] No cache found for ${sport}/${platform}`);
        return [];
      }

      // Read and parse file with corruption detection
      let cached: PropsCacheEntry;
      try {
        const content = await fs.readFile(filePath, 'utf-8');
        
        if (!content || content.trim().length === 0) {
          throw new Error("Empty file");
        }

        cached = JSON.parse(content);
      } catch (error) {
        // Corruption detected - repair it
        console.warn(`[CACHE CORRUPTION] file damaged: ${filePath}`);
        await this.repairCorruptedFile(filePath, sport, platform, error instanceof Error ? error.message : String(error));
        return [];
      }

      // Check TTL
      const cachedAt = new Date(cached.cachedAt).getTime();
      const age = Date.now() - cachedAt;
      const ageSeconds = age / 1000;

      if (ageSeconds > cached.ttl) {
        console.warn(`[CACHE STALE] ${sport}/${platform}: age ${ageSeconds.toFixed(0)}s > TTL ${cached.ttl}s`);
        // Delete stale file
        await fs.unlink(filePath).catch(() => {});
        return { stale: true };
      }

      // Check for corruption markers
      if (cached.corrupted || cached.lastRefreshFailed) {
        console.warn(`[CACHE CORRUPTION] ${sport}/${platform}: marked as corrupted or failed`);
        await this.repairCorruptedFile(filePath, sport, platform, cached.error || "Previous refresh failed");
        return [];
      }

      console.log(`[PROP CACHE] ✅ Found ${cached.props.length} cached props for ${sport}/${platform}`);
      return cached.props || [];
    } catch (error) {
      console.error(`[PROP CACHE] ❌ Error reading props from cache:`, error);
      return [];
    }
  }

  /**
   * Repair a corrupted cache file
   */
  private async repairCorruptedFile(
    filePath: string,
    sport: string,
    platform: string,
    errorMessage: string
  ): Promise<void> {
    try {
      const safeEntry: PropsCacheEntry = {
        sport,
        platform,
        props: [],
        cachedAt: new Date().toISOString(),
        ttl: this.defaultTTL,
        corrupted: true,
        lastRefreshFailed: true,
        error: errorMessage,
      };

      await fs.writeFile(filePath, JSON.stringify(safeEntry, null, 2), 'utf-8');
      console.log(`[CACHE REPAIR] Replaced corrupted file: ${filePath}`);
    } catch (error) {
      console.error(`[CACHE REPAIR] Failed to repair file ${filePath}:`, error);
      // Try to delete the file as last resort
      await fs.unlink(filePath).catch(() => {});
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
        const result = await this.getProps(sport, platform);
        
        // Skip if stale
        if (typeof result === 'object' && 'stale' in result && result.stale) {
          console.log(`[PROP CACHE] Skipping stale cache for ${sport}/${platform}`);
          continue;
        }
        
        // Extract props array
        const props = Array.isArray(result) ? result : [];
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
      const metadataPath = path.join(this.cacheDir, `${key}_metadata.json`);
      
      try {
        await fs.unlink(filePath);
        console.log(`[PROP CACHE] ✅ Cleared cache for ${sport}/${platform}`);
      } catch (error: any) {
        if (error.code !== 'ENOENT') {
          throw error;
        }
        // File doesn't exist, that's fine
      }

      // Also remove metadata file
      try {
        await fs.unlink(metadataPath);
      } catch (error: any) {
        // Ignore if metadata doesn't exist
      }
    } catch (error) {
      console.error(`[PROP CACHE] ❌ Error clearing props cache:`, error);
    }
  }

  /**
   * Repair cache by scanning for corrupted or stale files
   */
  async repairCache(): Promise<{ repaired: number; deleted: number; errors: string[] }> {
    const result = {
      repaired: 0,
      deleted: 0,
      errors: [] as string[],
    };

    try {
      // Ensure cache directory exists
      await fs.mkdir(this.cacheDir, { recursive: true });

      // Read all files in cache directory
      const files = await fs.readdir(this.cacheDir);
      const now = Date.now();

      for (const file of files) {
        // Skip metadata files
        if (file.endsWith('_metadata.json')) {
          continue;
        }

        // Skip non-JSON files
        if (!file.endsWith('.json')) {
          continue;
        }

        const filePath = path.join(this.cacheDir, file);

        try {
          // Try to read and parse the file
          const content = await fs.readFile(filePath, 'utf-8');
          
          if (!content || content.trim().length === 0) {
            console.warn(`[CACHE REPAIR] Empty file detected: ${file}`);
            await fs.unlink(filePath);
            result.deleted++;
            continue;
          }

          const cached: PropsCacheEntry = JSON.parse(content);

          // Check if corrupted
          if (cached.corrupted || cached.lastRefreshFailed) {
            console.warn(`[CACHE REPAIR] Corrupted file detected: ${file}`);
            const key = file.replace('.json', '');
            const [sport, platform] = key.split('_');
            await this.repairCorruptedFile(filePath, sport, platform, cached.error || "Marked as corrupted");
            result.repaired++;
            continue;
          }

          // Check if stale
          const cachedAt = new Date(cached.cachedAt).getTime();
          const age = now - cachedAt;
          const ageSeconds = age / 1000;

          if (ageSeconds > cached.ttl) {
            console.warn(`[CACHE REPAIR] Stale file detected: ${file} (age: ${ageSeconds.toFixed(0)}s, TTL: ${cached.ttl}s)`);
            await fs.unlink(filePath);
            result.deleted++;
            continue;
          }

        } catch (error) {
          // File is corrupted - can't parse JSON
          console.warn(`[CACHE REPAIR] Corrupted file (parse error): ${file}`);
          try {
            const key = file.replace('.json', '');
            const [sport, platform] = key.split('_');
            await this.repairCorruptedFile(filePath, sport || 'Unknown', platform || 'Unknown', 'JSON parse error');
            result.repaired++;
          } catch (repairError) {
            // If repair fails, delete the file
            await fs.unlink(filePath).catch(() => {});
            result.deleted++;
            result.errors.push(`Failed to repair ${file}: ${repairError instanceof Error ? repairError.message : String(repairError)}`);
          }
        }
      }

      console.log(`[CACHE REPAIR] ✅ Completed: ${result.repaired} repaired, ${result.deleted} deleted, ${result.errors.length} errors`);
      return result;
    } catch (error) {
      console.error(`[CACHE REPAIR] ❌ Error during cache repair:`, error);
      result.errors.push(error instanceof Error ? error.message : String(error));
      return result;
    }
  }

  /**
   * Get cache statistics and file information
   */
  async getCacheInfo(): Promise<{
    files: Array<{
      name: string;
      sizeKB: number;
      modified: string;
      sport?: string;
      platform?: string;
      ttl?: number;
      age?: number;
      corrupted?: boolean;
    }>;
    corrupted: number;
    stale: number;
    total: number;
  }> {
    const info = {
      files: [] as Array<{
        name: string;
        sizeKB: number;
        modified: string;
        sport?: string;
        platform?: string;
        ttl?: number;
        age?: number;
        corrupted?: boolean;
      }>,
      corrupted: 0,
      stale: 0,
      total: 0,
    };

    try {
      await fs.mkdir(this.cacheDir, { recursive: true });
      const files = await fs.readdir(this.cacheDir);
      const now = Date.now();

      for (const file of files) {
        if (file.endsWith('_metadata.json') || !file.endsWith('.json')) {
          continue;
        }

        const filePath = path.join(this.cacheDir, file);
        const stats = await fs.stat(filePath);
        const sizeKB = stats.size / 1024;

        try {
          const content = await fs.readFile(filePath, 'utf-8');
          const cached: PropsCacheEntry = JSON.parse(content);

          const cachedAt = new Date(cached.cachedAt).getTime();
          const age = (now - cachedAt) / 1000; // age in seconds
          const isStale = age > cached.ttl;
          const isCorrupted = cached.corrupted || cached.lastRefreshFailed;

          if (isStale) info.stale++;
          if (isCorrupted) info.corrupted++;

          const key = file.replace('.json', '');
          const [sport, platform] = key.split('_');

          info.files.push({
            name: file,
            sizeKB: Math.round(sizeKB * 100) / 100,
            modified: stats.mtime.toISOString(),
            sport,
            platform,
            ttl: cached.ttl,
            age: Math.round(age),
            corrupted: isCorrupted,
          });
        } catch {
          // Can't parse - corrupted
          info.corrupted++;
          info.files.push({
            name: file,
            sizeKB: Math.round(sizeKB * 100) / 100,
            modified: stats.mtime.toISOString(),
            corrupted: true,
          });
        }

        info.total++;
      }
    } catch (error) {
      console.error(`[PROP CACHE] Error getting cache info:`, error);
    }

    return info;
  }
}

export const propCacheService = new PropCacheService();

