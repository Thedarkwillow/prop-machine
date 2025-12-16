import { ingestAllProps } from '../ingestion/propIngestion.js';

class PropSchedulerService {
  private intervalId: NodeJS.Timeout | null = null;
  private isRunning: boolean = false;
  private refreshIntervalMinutes: number = 15;
  private lastRefreshTime: Date | null = null;
  private lastSuccessfulRefresh: Date | null = null;
  private lastError: string | null = null;
  private consecutiveFailures: number = 0;
  private pausedUntil: Date | null = null;

  /**
   * Start the automatic prop refresh scheduler
   * Runs every 15 minutes by default
   */
  start(intervalMinutes: number = 15): void {
    if (this.isRunning) {
      console.log('Prop scheduler is already running');
      return;
    }

    this.refreshIntervalMinutes = intervalMinutes;
    const intervalMs = intervalMinutes * 60 * 1000;

    console.log(`Starting prop refresh scheduler (every ${intervalMinutes} minutes)`);

    // Run immediately on start
    this.runRefresh();

    // Then run on interval
    this.intervalId = setInterval(() => {
      this.runRefresh();
    }, intervalMs);

    this.isRunning = true;
  }

  /**
   * Stop the scheduler
   */
  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
      this.isRunning = false;
      console.log('Prop refresh scheduler stopped');
    }
  }

  /**
   * Get scheduler status
   */
  getStatus(): {
    isRunning: boolean;
    intervalMinutes: number;
    lastRefresh: Date | null;
    lastSuccessfulRefresh: Date | null;
    lastError: string | null;
    nextRefresh: Date | null;
    pausedUntil: Date | null;
    consecutiveFailures: number;
  } {
    let nextRefresh: Date | null = null;
    if (this.isRunning && this.lastRefreshTime && !this.pausedUntil) {
      nextRefresh = new Date(
        this.lastRefreshTime.getTime() + this.refreshIntervalMinutes * 60 * 1000
      );
    } else if (this.pausedUntil) {
      nextRefresh = this.pausedUntil;
    }

    return {
      isRunning: this.isRunning,
      intervalMinutes: this.refreshIntervalMinutes,
      lastRefresh: this.lastRefreshTime,
      lastSuccessfulRefresh: this.lastSuccessfulRefresh,
      lastError: this.lastError,
      nextRefresh,
      pausedUntil: this.pausedUntil,
      consecutiveFailures: this.consecutiveFailures,
    };
  }

  /**
   * Execute a prop refresh across all sports and platforms
   */
  private async runRefresh(): Promise<void> {
    // Check if scheduler is paused due to rate limits
    if (this.pausedUntil && this.pausedUntil > new Date()) {
      const minutesRemaining = Math.ceil((this.pausedUntil.getTime() - Date.now()) / 60000);
      console.log(`\n⏸️  Scheduler paused due to API rate limits. Resuming in ${minutesRemaining} minutes.`);
      // Stop the interval if it's still running
      if (this.intervalId) {
        clearInterval(this.intervalId);
        this.intervalId = null;
        this.isRunning = false;
        console.log('⏸️  Scheduler interval stopped. Will resume automatically when pause expires.');
      }
      return;
    }
    
    // Reset pause if time has passed and restart scheduler
    if (this.pausedUntil && this.pausedUntil <= new Date()) {
      console.log('\n✅ Rate limit pause expired, resuming scheduler');
      this.pausedUntil = null;
      this.consecutiveFailures = 0;
      // Restart the scheduler if it was stopped
      if (!this.isRunning && !this.intervalId) {
        const intervalMs = this.refreshIntervalMinutes * 60 * 1000;
        this.intervalId = setInterval(() => {
          this.runRefresh();
        }, intervalMs);
        this.isRunning = true;
        console.log(`✅ Scheduler restarted (every ${this.refreshIntervalMinutes} minutes)`);
      }
    }

    this.lastRefreshTime = new Date();
    
    try {
      console.log('\n========================================');
      console.log('🔄 Running scheduled prop refresh...');
      console.log(`⏰ Time: ${new Date().toLocaleString()}`);
      console.log('========================================\n');

      // Use browser-based ingestion
      const sports = ['NBA', 'NFL', 'NHL'];
      const result = await ingestAllProps(sports);

      const hasActualData = result.fetched > 0;
      const hasErrors = result.errors.length > 0;

      if (hasActualData && result.upserted + result.updated > 0) {
        // Real success - reset failure counter
        this.consecutiveFailures = 0;
        this.pausedUntil = null;
        this.lastSuccessfulRefresh = new Date();
        this.lastError = null;
        
        console.log('\n========================================');
        console.log('✅ Scheduled browser ingestion completed');
        console.log(`📊 Total props scraped: ${result.fetched}`);
        console.log(`✨ Total props inserted: ${result.upserted}`);
        console.log(`🔄 Total props updated: ${result.updated}`);
        console.log(`❌ Total errors: ${result.errors.length}`);
        console.log(`⏰ Next refresh: ${new Date(
          Date.now() + this.refreshIntervalMinutes * 60 * 1000
        ).toLocaleTimeString()}`);
        console.log('========================================\n');

        // Log per-platform results
        for (const [platform, stats] of Object.entries(result.byPlatform)) {
          console.log(`  ${platform}: ${stats.fetched} scraped, ${stats.upserted} inserted, ${stats.updated} updated`);
        }
      } else if (!hasActualData && hasErrors) {
        // Failed scraping - increment failure counter
        this.consecutiveFailures++;
        this.lastError = `Browser ingestion failed. Scraped: ${result.fetched}, Errors: ${result.errors.length}`;
        
        console.log('\n========================================');
        console.log(`⚠️  Scheduled browser ingestion failed`);
        console.log(`📊 Total props scraped: ${result.fetched}`);
        console.log(`❌ Total errors: ${result.errors.length}`);
        console.log(`🔄 Consecutive failures: ${this.consecutiveFailures}`);
        
        // Log error details
        if (result.errors.length > 0) {
          console.log(`  Errors: ${result.errors.slice(0, 5).join('; ')}`);
        }
        
        // Pause scheduler if we've had 3+ consecutive failures
        if (this.consecutiveFailures >= 3) {
          const pauseMinutes = 30;
          this.pausedUntil = new Date(Date.now() + pauseMinutes * 60 * 1000);
          console.log(`⏸️  Pausing scheduler for ${pauseMinutes} minutes due to repeated failures`);
          console.log(`⏰ Will resume at: ${this.pausedUntil.toLocaleTimeString()}`);
          // Stop the interval
          if (this.intervalId) {
            clearInterval(this.intervalId);
            this.intervalId = null;
            this.isRunning = false;
            console.log('⏸️  Scheduler interval stopped');
            // Schedule automatic resume
            setTimeout(() => {
              console.log('✅ Pause expired, restarting scheduler...');
              this.pausedUntil = null;
              this.consecutiveFailures = 0;
              this.start(this.refreshIntervalMinutes);
            }, pauseMinutes * 60 * 1000);
          }
        } else {
          console.log(`⏰ Next refresh: ${new Date(
            Date.now() + this.refreshIntervalMinutes * 60 * 1000
          ).toLocaleTimeString()}`);
        }
        console.log('========================================\n');
      } else {
        // Other case (no data but no errors, or partial success)
        this.lastError = `Ingestion completed. Scraped: ${result.fetched}, Inserted: ${result.upserted}, Errors: ${result.errors.length}`;
        console.log('\n========================================');
        console.log('⚠️  Scheduled browser ingestion completed with warnings');
        console.log(`📊 Total props scraped: ${result.fetched}`);
        console.log(`✨ Total props inserted: ${result.upserted}`);
        console.log(`🔄 Total props updated: ${result.updated}`);
        console.log(`❌ Total errors: ${result.errors.length}`);
        console.log(`⏰ Next refresh: ${new Date(
          Date.now() + this.refreshIntervalMinutes * 60 * 1000
        ).toLocaleTimeString()}`);
        console.log('========================================\n');
      }
    } catch (error) {
      const err = error as Error;
      this.consecutiveFailures++;
      this.lastError = err.message;
      console.error('\n========================================');
      console.error('❌ Scheduled prop refresh failed:', err.message);
      console.error(`🔄 Consecutive failures: ${this.consecutiveFailures}`);
      if (this.consecutiveFailures >= 3) {
        const pauseMinutes = 30;
        this.pausedUntil = new Date(Date.now() + pauseMinutes * 60 * 1000);
        console.error(`⏸️  Pausing scheduler for ${pauseMinutes} minutes`);
        console.error(`⏰ Will resume at: ${this.pausedUntil.toLocaleTimeString()}`);
        // Stop the interval to prevent further API calls
        if (this.intervalId) {
          clearInterval(this.intervalId);
          this.intervalId = null;
          this.isRunning = false;
          console.error('⏸️  Scheduler interval stopped to prevent further API calls');
          // Schedule automatic resume
          setTimeout(() => {
            console.log('✅ Rate limit pause expired, restarting scheduler...');
            this.pausedUntil = null;
            this.consecutiveFailures = 0;
            this.start(this.refreshIntervalMinutes);
          }, pauseMinutes * 60 * 1000);
        }
      }
      console.error('========================================\n');
      console.error(error);
    }
  }

  /**
   * Manually trigger a refresh (updates scheduler status)
   */
  async triggerManualRefresh(sports?: string[]): Promise<any> {
    console.log('🔄 Manual browser ingestion triggered');
    const targetSports = sports || ['NBA', 'NFL', 'NHL'];
    
    this.lastRefreshTime = new Date();
    const result = await ingestAllProps(targetSports);
    
    // Consider successful if props were scraped and inserted
    if (result.fetched > 0 && result.upserted + result.updated > 0) {
      this.lastSuccessfulRefresh = new Date();
      this.lastError = null;
      this.consecutiveFailures = 0;
      console.log(`✅ Manual ingestion completed - Scraped: ${result.fetched}, Inserted: ${result.upserted}, Updated: ${result.updated}`);
    } else {
      this.lastError = `Manual ingestion completed. Scraped: ${result.fetched}, Inserted: ${result.upserted}, Errors: ${result.errors.length}`;
      if (result.errors.length > 0) {
        console.error('❌ Manual ingestion had errors:', result.errors.slice(0, 3));
      }
    }
    
    return result;
  }
}

export const propSchedulerService = new PropSchedulerService();
