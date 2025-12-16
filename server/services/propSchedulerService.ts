import { propRefreshService } from './propRefreshService';

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
      return;
    }
    
    // Reset pause if time has passed
    if (this.pausedUntil && this.pausedUntil <= new Date()) {
      console.log('\n✅ Rate limit pause expired, resuming scheduler');
      this.pausedUntil = null;
      this.consecutiveFailures = 0;
    }

    this.lastRefreshTime = new Date();
    
    try {
      console.log('\n========================================');
      console.log('🔄 Running scheduled prop refresh...');
      console.log(`⏰ Time: ${new Date().toLocaleString()}`);
      console.log('========================================\n');

      // Refresh props for major sports
      const sports = ['NBA', 'NFL', 'NHL'];
      const result = await propRefreshService.refreshAllPlatforms(sports);

      // Check if this was a real success (props fetched) or just no errors but also no data
      const hasRateLimitErrors = result.results.some(r => 
        r.errors.some(e => e.includes('429') || e.includes('401') || e.includes('quota') || e.includes('rate limit'))
      );
      const hasActualData = result.totalPropsFetched > 0;

      if (result.success && hasActualData) {
        // Real success - reset failure counter
        this.consecutiveFailures = 0;
        this.pausedUntil = null;
        this.lastSuccessfulRefresh = new Date();
        this.lastError = null;
        
        console.log('\n========================================');
        console.log('✅ Scheduled prop refresh completed');
        console.log(`📊 Total props fetched: ${result.totalPropsFetched}`);
        console.log(`✨ Total props created: ${result.totalPropsCreated}`);
        console.log(`❌ Total errors: ${result.totalErrors}`);
        console.log(`⏰ Next refresh: ${new Date(
          Date.now() + this.refreshIntervalMinutes * 60 * 1000
        ).toLocaleTimeString()}`);
        console.log('========================================\n');

        // Log individual platform results
        result.results.forEach((r) => {
          console.log(
            `  ${r.platform} (${r.sport}): ${r.propsCreated}/${r.propsFetched} props created`
          );
          if (r.errors.length > 0) {
            console.log(`    ⚠️  Errors: ${r.errors.slice(0, 3).join(', ')}`);
          }
        });
      } else if (hasRateLimitErrors && !hasActualData) {
        // Rate limited with no data - increment failure counter
        this.consecutiveFailures++;
        this.lastError = `Rate limited. Fetched: ${result.totalPropsFetched}, Errors: ${result.totalErrors}`;
        
        console.log('\n========================================');
        console.log('⚠️  Scheduled refresh hit API rate limits');
        console.log(`📊 Total props fetched: ${result.totalPropsFetched}`);
        console.log(`❌ Total errors: ${result.totalErrors}`);
        console.log(`🔄 Consecutive failures: ${this.consecutiveFailures}`);
        
        // Pause scheduler if we've had 3+ consecutive failures
        if (this.consecutiveFailures >= 3) {
          const pauseMinutes = 30; // Pause for 30 minutes
          this.pausedUntil = new Date(Date.now() + pauseMinutes * 60 * 1000);
          console.log(`⏸️  Pausing scheduler for ${pauseMinutes} minutes due to repeated rate limits`);
          console.log(`⏰ Will resume at: ${this.pausedUntil.toLocaleTimeString()}`);
        } else {
          console.log(`⏰ Next refresh: ${new Date(
            Date.now() + this.refreshIntervalMinutes * 60 * 1000
          ).toLocaleTimeString()}`);
        }
        console.log('========================================\n');
      } else {
        // Other failure or empty response
        this.lastError = `Refresh failed. Fetched: ${result.totalPropsFetched}, Errors: ${result.totalErrors}`;
        console.log('\n========================================');
        console.log('⚠️  Scheduled prop refresh completed with warnings');
        console.log(`📊 Total props fetched: ${result.totalPropsFetched}`);
        console.log(`✨ Total props created: ${result.totalPropsCreated}`);
        console.log(`❌ Total errors: ${result.totalErrors}`);
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
      }
      console.error('========================================\n');
      console.error(error);
    }
  }

  /**
   * Manually trigger a refresh (updates scheduler status)
   */
  async triggerManualRefresh(sports?: string[]): Promise<any> {
    console.log('🔄 Manual prop refresh triggered');
    const targetSports = sports || ['NBA', 'NFL', 'NHL'];
    
    this.lastRefreshTime = new Date();
    const result = await propRefreshService.refreshAllPlatforms(targetSports);
    
    // Consider successful if API calls succeeded (even if no new props created due to duplicates)
    if (result.success) {
      this.lastSuccessfulRefresh = new Date();
      this.lastError = null;
      console.log(`✅ Manual refresh completed - Fetched: ${result.totalPropsFetched}, Created: ${result.totalPropsCreated}`);
    } else {
      this.lastError = `Manual refresh failed. Fetched: ${result.totalPropsFetched}, Errors: ${result.totalErrors}`;
      console.error('❌ Manual refresh failed - all platforms returned errors');
    }
    
    return result;
  }
}

export const propSchedulerService = new PropSchedulerService();
