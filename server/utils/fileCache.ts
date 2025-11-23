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
      
      // Check if file exists
      try {
        await fs.access(filePath);
      } catch {
        return null; // File doesn't exist
      }

      // Read and parse cache file
      const content = await fs.readFile(filePath, 'utf-8');
      const entry: CacheEntry<T> = JSON.parse(content);

      // Check if cache is expired
      const age = Date.now() - entry.createdAt;
      if (age > entry.ttl * 1000) {
        // Cache expired, delete file
        await fs.unlink(filePath).catch(() => {}); // Ignore errors
        return null;
      }

      return entry.data;
    } catch (error) {
      console.error(`Cache read error for ${namespace}/${key}:`, error);
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
      const entry: CacheEntry<T> = {
        data,
        etag,
        lastModified,
        createdAt: Date.now(),
        ttl,
      };

      await fs.writeFile(filePath, JSON.stringify(entry, null, 2), 'utf-8');
    } catch (error) {
      console.error(`Cache write error for ${namespace}/${key}:`, error);
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
  private getCacheFilePath(namespace: string, key: string): string {
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
}

// Singleton instance
export const fileCache = new FileCache();

// Initialize cache directory on module load
fileCache.initCache().catch(err => {
  console.error('Failed to initialize file cache:', err);
});

