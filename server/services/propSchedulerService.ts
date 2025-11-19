import { propRefreshService } from './propRefreshService';

class PropSchedulerService {
  private intervalId: NodeJS.Timeout | null = null;
  private isRunning: boolean = false;
  private refreshIntervalMinutes: number = 15;
  private lastRefreshTime: Date | null = null;
  private lastSuccessfulRefresh: Date | null = null;
  private lastError: string | null = null;

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
  } {
    let nextRefresh: Date | null = null;
    if (this.isRunning && this.lastRefreshTime) {
      nextRefresh = new Date(
        this.lastRefreshTime.getTime() + this.refreshIntervalMinutes * 60 * 1000
      );
    }

    return {
      isRunning: this.isRunning,
      intervalMinutes: this.refreshIntervalMinutes,
      lastRefresh: this.lastRefreshTime,
      lastSuccessfulRefresh: this.lastSuccessfulRefresh,
      lastError: this.lastError,
      nextRefresh,
    };
  }

  /**
   * Execute a prop refresh across all sports and platforms
   */
  private async runRefresh(): Promise<void> {
    this.lastRefreshTime = new Date();
    
    try {
      console.log('\n========================================');
      console.log('🔄 Running scheduled prop refresh...');
      console.log(`⏰ Time: ${new Date().toLocaleString()}`);
      console.log('========================================\n');

      // Refresh props for major sports
      const sports = ['NBA', 'NFL', 'NHL'];
      const result = await propRefreshService.refreshAllPlatforms(sports);

      // Consider successful if API calls succeeded (even if no new props created due to duplicates)
      if (result.success) {
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
      } else {
        // All platforms failed
        this.lastError = `Refresh failed. Fetched: ${result.totalPropsFetched}, Errors: ${result.totalErrors}`;
        console.error('❌ Prop refresh failed - all platforms returned errors');
      }
    } catch (error) {
      const err = error as Error;
      this.lastError = err.message;
      console.error('❌ Scheduled prop refresh failed:', err.message);
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
