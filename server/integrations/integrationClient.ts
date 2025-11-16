import { storage } from "../storage";

export interface RateLimitConfig {
  provider: string;
  requestsPerMinute: number;
  requestsPerHour: number;
  requestsPerDay: number;
}

export interface CacheConfig {
  ttl: number; // Time to live in seconds
  useETag: boolean;
  useLastModified: boolean;
}

export interface IntegrationResponse<T> {
  data: T;
  cached: boolean;
  etag?: string;
  lastModified?: string;
}

export class IntegrationClient {
  private baseUrl: string;
  private rateLimitConfig: RateLimitConfig;
  private cacheConfig: CacheConfig;
  private defaultHeaders: Record<string, string>;

  constructor(
    baseUrl: string,
    rateLimitConfig: RateLimitConfig,
    cacheConfig: CacheConfig = { ttl: 300, useETag: true, useLastModified: true },
    headers: Record<string, string> = {}
  ) {
    this.baseUrl = baseUrl;
    this.rateLimitConfig = rateLimitConfig;
    this.cacheConfig = cacheConfig;
    this.defaultHeaders = {
      'User-Agent': 'PropMachine/1.0',
      ...headers,
    };
  }

  async checkRateLimit(): Promise<boolean> {
    try {
      let limit = await storage.getProviderLimit(this.rateLimitConfig.provider);
      
      // Idempotently create provider limit if it doesn't exist
      if (!limit) {
        try {
          limit = await storage.createProviderLimit(this.rateLimitConfig);
        } catch (error) {
          // If creation fails (race condition), try to get it again
          limit = await storage.getProviderLimit(this.rateLimitConfig.provider);
          if (!limit) {
            console.warn(`Could not create or retrieve provider limit for ${this.rateLimitConfig.provider}`);
            return true; // Allow request to proceed
          }
        }
      }

      const now = new Date();
      const lastReset = new Date(limit.lastReset);
      const timeSinceReset = (now.getTime() - lastReset.getTime()) / 1000;

      if (timeSinceReset >= 86400) {
        await storage.updateProviderLimit(this.rateLimitConfig.provider, {
          currentMinute: 0,
          currentHour: 0,
          currentDay: 0,
          lastReset: now,
          updatedAt: now,
        });
        return true;
      }

      if (limit.currentDay >= this.rateLimitConfig.requestsPerDay) {
        console.warn(`Daily rate limit exceeded for ${this.rateLimitConfig.provider}`);
        return false;
      }

      if (limit.currentHour >= this.rateLimitConfig.requestsPerHour) {
        console.warn(`Hourly rate limit exceeded for ${this.rateLimitConfig.provider}`);
        return false;
      }

      if (limit.currentMinute >= this.rateLimitConfig.requestsPerMinute) {
        console.warn(`Minute rate limit exceeded for ${this.rateLimitConfig.provider}`);
        return false;
      }

      return true;
    } catch (error) {
      console.error(`Rate limit check error for ${this.rateLimitConfig.provider}:`, error);
      return true;
    }
  }

  async incrementRateLimit(): Promise<void> {
    try {
      let limit = await storage.getProviderLimit(this.rateLimitConfig.provider);
      
      // Create if doesn't exist (idempotent)
      if (!limit) {
        try {
          limit = await storage.createProviderLimit(this.rateLimitConfig);
        } catch (error) {
          // If creation fails, try to get it again
          limit = await storage.getProviderLimit(this.rateLimitConfig.provider);
        }
      }
      
      if (limit) {
        await storage.updateProviderLimit(this.rateLimitConfig.provider, {
          currentMinute: limit.currentMinute + 1,
          currentHour: limit.currentHour + 1,
          currentDay: limit.currentDay + 1,
          updatedAt: new Date(),
        });
      } else {
        console.warn(`Could not increment rate limit for ${this.rateLimitConfig.provider} - no limit record found`);
      }
    } catch (error) {
      console.error(`Rate limit increment error for ${this.rateLimitConfig.provider}:`, error);
    }
  }

  async get<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<IntegrationResponse<T>> {
    const canProceed = await this.checkRateLimit();
    
    if (!canProceed) {
      const cached = await this.getCachedResponse<T>(endpoint);
      if (cached) {
        return { data: cached, cached: true };
      }
      throw new Error(`Rate limit exceeded for ${this.rateLimitConfig.provider} and no cached data available`);
    }

    const url = `${this.baseUrl}${endpoint}`;
    const headers = { ...this.defaultHeaders, ...options.headers };

    try {
      const response = await fetch(url, {
        ...options,
        method: 'GET',
        headers,
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      await this.incrementRateLimit();

      const data = await response.json() as T;
      const etag = response.headers.get('etag') || undefined;
      const lastModified = response.headers.get('last-modified') || undefined;

      await this.cacheResponse(endpoint, data, etag, lastModified);

      return { data, cached: false, etag, lastModified };
    } catch (error) {
      console.error(`Integration error for ${this.rateLimitConfig.provider}:`, error);
      
      const cached = await this.getCachedResponse<T>(endpoint);
      if (cached) {
        return { data: cached, cached: true };
      }
      
      throw error;
    }
  }

  async retryWithBackoff<T>(
    fn: () => Promise<IntegrationResponse<T>>,
    maxRetries: number = 3,
    initialDelay: number = 1000
  ): Promise<IntegrationResponse<T>> {
    let lastError: Error | undefined;
    
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error as Error;
        if (attempt < maxRetries - 1) {
          const delay = initialDelay * Math.pow(2, attempt);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }
    
    throw lastError || new Error('Max retries exceeded');
  }

  private async cacheResponse<T>(
    endpoint: string,
    data: T,
    etag?: string,
    lastModified?: string
  ): Promise<void> {
    try {
      await storage.createDataFeed({
        provider: this.rateLimitConfig.provider,
        endpoint,
        response: data as any,
        etag,
        lastModified,
      });
    } catch (error) {
      console.error('Cache write error:', error);
    }
  }

  private async getCachedResponse<T>(endpoint: string): Promise<T | null> {
    try {
      const feeds = await storage.getDataFeeds(this.rateLimitConfig.provider, endpoint);
      if (feeds.length > 0) {
        const latest = feeds[0];
        const age = Date.now() - new Date(latest.createdAt).getTime();
        
        if (age < this.cacheConfig.ttl * 1000) {
          return latest.response as T;
        }
      }
    } catch (error) {
      console.error('Cache read error:', error);
    }
    
    return null;
  }
}
