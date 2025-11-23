import * as fs from 'fs/promises';
import * as path from 'path';

interface CacheEntry<T> {
  data: T;
  etag?: string;
  lastModified?: string;
  createdAt: number;
  ttl: number;
}

/**
 * File-based cache for API responses
 * Stores cache entries as JSON files under /cache/<namespace>/
 */
class FileCache {
  private cacheDir: string;

  constructor() {
    // Cache directory at project root
    this.cacheDir = path.join(process.cwd(), 'cache');
  }

  /**
   * Initialize cache directory structure
   */
  async initCache(): Promise<void> {
    try {
      await fs.mkdir(this.cacheDir, { recursive: true });
    } catch (error) {
      console.error('Failed to create cache directory:', error);
      throw error;
    }
  }

  /**
   * Get cache entry for a key
   */
  async getCache<T>(namespace: string, key: string, ttl: number): Promise<T | null> {
    try {
      const filePath = this.getCacheFilePath(namespace, key);
      console.log(`[CACHE READ] Attempting to read cache: namespace=${namespace}, key=${key}`);
      console.log(`[CACHE READ] Full filepath: ${filePath}`);
      
      // Check if file exists
      try {
        await fs.access(filePath);
        console.log(`[CACHE READ] Cache file exists at ${filePath}`);
      } catch {
        console.log(`[CACHE READ] Cache MISS - file does not exist: ${filePath}`);
        return null; // File doesn't exist
      }

      // Read and parse cache file
      const content = await fs.readFile(filePath, 'utf-8');
      const entry: CacheEntry<T> = JSON.parse(content);

      // Check if cache is expired
      const age = Date.now() - entry.createdAt;
      const ageSeconds = age / 1000;
      const ageMinutes = ageSeconds / 60;
      const ageHours = ageMinutes / 60;
      const ttlSeconds = entry.ttl;
      const ttlMinutes = ttlSeconds / 60;
      
      console.log(`[CACHE READ] Cache entry found - Created: ${new Date(entry.createdAt).toISOString()}`);
      console.log(`[CACHE READ] Cache age: ${ageSeconds.toFixed(1)}s (${ageMinutes.toFixed(2)} minutes, ${ageHours.toFixed(2)} hours)`);
      console.log(`[CACHE READ] Cache TTL: ${ttlSeconds}s (${ttlMinutes.toFixed(1)} minutes)`);
      
      if (age > entry.ttl * 1000) {
        // Cache expired, delete file
        console.log(`[CACHE READ] STALE CACHE DETECTED - age ${ageSeconds.toFixed(1)}s exceeds TTL ${ttlSeconds}s`);
        console.log(`[CACHE READ] Deleting expired cache file: ${filePath}`);
        await fs.unlink(filePath).catch(() => {}); // Ignore errors
        return null;
      }

      const remainingTTL = entry.ttl - ageSeconds;
      console.log(`[CACHE READ] Cache HIT - valid cache found, remaining TTL: ${remainingTTL.toFixed(1)}s (${(remainingTTL / 60).toFixed(2)} minutes)`);
      return entry.data;
    } catch (error) {
      console.error(`[CACHE READ] Cache read error for ${namespace}/${key}:`, error);
      return null;
    }
  }

  /**
   * Set cache entry for a key
   */
  async setCache<T>(
    namespace: string,
    key: string,
    data: T,
    ttl: number,
    etag?: string,
    lastModified?: string
  ): Promise<void> {
    try {
      const namespaceDir = path.join(this.cacheDir, namespace);
      await fs.mkdir(namespaceDir, { recursive: true });

      const filePath = this.getCacheFilePath(namespace, key);
      console.log(`[CACHE WRITE] Writing cache: namespace=${namespace}, key=${key}`);
      console.log(`[CACHE WRITE] Full filepath: ${filePath}`);
      console.log(`[CACHE WRITE] TTL: ${ttl}s (${(ttl / 60).toFixed(1)} minutes, ${(ttl / 3600).toFixed(2)} hours)`);
      console.log(`[CACHE WRITE] ETag: ${etag || 'none'}, LastModified: ${lastModified || 'none'}`);
      
      const entry: CacheEntry<T> = {
        data,
        etag,
        lastModified,
        createdAt: Date.now(),
        ttl,
      };

      await fs.writeFile(filePath, JSON.stringify(entry, null, 2), 'utf-8');
      console.log(`[CACHE WRITE] Successfully wrote cache file: ${filePath}`);
      console.log(`[CACHE WRITE] Cache will expire at: ${new Date(Date.now() + ttl * 1000).toISOString()}`);
    } catch (error) {
      console.error(`[CACHE WRITE] Cache write error for ${namespace}/${key}:`, error);
      // Don't throw - caching failures shouldn't break the app
    }
  }

  /**
   * Clean up expired entries in a namespace
   */
  async cleanupNamespace(namespace: string): Promise<void> {
    try {
      const namespaceDir = path.join(this.cacheDir, namespace);
      
      try {
        await fs.access(namespaceDir);
      } catch {
        return; // Namespace directory doesn't exist
      }

      const files = await fs.readdir(namespaceDir);
      const now = Date.now();
      let cleaned = 0;

      for (const file of files) {
        if (!file.endsWith('.json')) continue;

        try {
          const filePath = path.join(namespaceDir, file);
          const content = await fs.readFile(filePath, 'utf-8');
          const entry: CacheEntry<any> = JSON.parse(content);

          const age = now - entry.createdAt;
          if (age > entry.ttl * 1000) {
            await fs.unlink(filePath);
            cleaned++;
          }
        } catch (error) {
          // Skip files that can't be read/parsed
          console.warn(`Failed to check cache file ${file}:`, error);
        }
      }

      if (cleaned > 0) {
        console.log(`Cleaned up ${cleaned} expired cache entries from ${namespace}`);
      }
    } catch (error) {
      console.error(`Cache cleanup error for ${namespace}:`, error);
    }
  }

  /**
   * Get cache file path for a namespace and key
   */
  getCacheFilePath(namespace: string, key: string): string {
    // Sanitize key to be filesystem-safe
    const safeKey = key
      .replace(/[^a-zA-Z0-9._-]/g, '_')
      .replace(/_{2,}/g, '_')
      .substring(0, 200); // Limit filename length
    
    return path.join(this.cacheDir, namespace, `${safeKey}.json`);
  }

  /**
   * Map provider name to cache namespace
   */
  getNamespace(provider: string): string {
    const namespaceMap: Record<string, string> = {
      'espn_players': 'espn',
      'espn_scoreboard': 'espn',
      'prizepicks': 'prizepicks',
      'odds_api': 'odds',
      // Add other providers as needed
    };

    return namespaceMap[provider] || provider.toLowerCase().replace(/[^a-z0-9]/g, '_');
  }

  /**
   * PrizePicks snapshot-specific cache methods
   * These maintain compatibility with the PrizePicksSnapshot interface
   */
  async savePrizePicksSnapshot(
    sport: string,
    leagueId: string,
    payload: any,
    propCount: number,
    ttlHours: number = 24
  ): Promise<void> {
    const namespace = 'prizepicks';
    const key = `snapshot_${sport}_${leagueId}`;
    const ttl = ttlHours * 60 * 60; // Convert hours to seconds
    
    console.log(`[PRIZEPICKS SNAPSHOT] Saving snapshot: sport=${sport}, leagueId=${leagueId}, propCount=${propCount}, ttlHours=${ttlHours}`);
    
    // Store with metadata matching PrizePicksSnapshot structure
    const snapshotData = {
      sport,
      leagueId,
      payload,
      propCount,
      ttlHours,
      fetchedAt: new Date().toISOString(),
    };
    
    await this.setCache(namespace, key, snapshotData, ttl);
    console.log(`[PRIZEPICKS SNAPSHOT] Successfully saved snapshot for ${sport}/${leagueId} with ${propCount} props`);
  }

  async getLatestPrizePicksSnapshot(
    sport: string,
    leagueId: string
  ): Promise<{ sport: string; leagueId: string; payload: any; propCount: number; ttlHours: number; fetchedAt: string } | null> {
    const namespace = 'prizepicks';
    const key = `snapshot_${sport}_${leagueId}`;
    console.log(`[PRIZEPICKS SNAPSHOT] Reading snapshot: sport=${sport}, leagueId=${leagueId}`);
    
    // Use a long TTL for the get - we'll check ttlHours in the caller
    const cached = await this.getCache<any>(namespace, key, 86400 * 7); // 7 days max
    
    if (!cached) {
      console.log(`[PRIZEPICKS SNAPSHOT] No snapshot found for ${sport}/${leagueId}`);
      return null;
    }
    
    // Check if cache is still valid based on ttlHours
    const fetchedAt = new Date(cached.fetchedAt);
    const ageHours = (Date.now() - fetchedAt.getTime()) / (1000 * 60 * 60);
    const ageMinutes = ageHours * 60;
    
    console.log(`[PRIZEPICKS SNAPSHOT] Snapshot found - Fetched: ${cached.fetchedAt}`);
    console.log(`[PRIZEPICKS SNAPSHOT] Snapshot age: ${ageHours.toFixed(2)} hours (${ageMinutes.toFixed(1)} minutes)`);
    console.log(`[PRIZEPICKS SNAPSHOT] Snapshot TTL: ${cached.ttlHours} hours, Prop count: ${cached.propCount}`);
    
    if (ageHours > cached.ttlHours) {
      // Cache expired, delete it
      console.log(`[PRIZEPICKS SNAPSHOT] STALE SNAPSHOT - age ${ageHours.toFixed(2)}h exceeds TTL ${cached.ttlHours}h`);
      const filePath = this.getCacheFilePath(namespace, key);
      console.log(`[PRIZEPICKS SNAPSHOT] Deleting expired snapshot: ${filePath}`);
      await fs.unlink(filePath).catch(() => {});
      return null;
    }
    
    const remainingHours = cached.ttlHours - ageHours;
    console.log(`[PRIZEPICKS SNAPSHOT] Valid snapshot found, remaining TTL: ${remainingHours.toFixed(2)} hours`);
    return cached;
  }

  /**
   * Get age of a PrizePicks snapshot in hours
   */
  getSnapshotAgeHours(snapshot: { fetchedAt: string }): number {
    const fetchedAt = new Date(snapshot.fetchedAt);
    return (Date.now() - fetchedAt.getTime()) / (1000 * 60 * 60);
  }

  /**
   * Clean up all expired cache entries across all namespaces
   */
  async cleanupAll(): Promise<void> {
    try {
      const namespaces = ['espn', 'prizepicks', 'odds'];
      for (const namespace of namespaces) {
        await this.cleanupNamespace(namespace);
      }
    } catch (error) {
      console.error('Cache cleanup error:', error);
    }
  }
}

// Singleton instance
export const fileCache = new FileCache();

// Initialize cache directory on module load
fileCache.initCache().catch(err => {
  console.error('Failed to initialize file cache:', err);
});

