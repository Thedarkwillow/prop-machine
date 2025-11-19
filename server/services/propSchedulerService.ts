import { propRefreshService } from './propRefreshService';

class PropSchedulerService {
  private intervalId: NodeJS.Timeout | null = null;
  private isRunning: boolean = false;
  private refreshIntervalMinutes: number = 15;
  private lastRefreshTime: Date | null = null;

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
      nextRefresh,
    };
  }

  /**
   * Execute a prop refresh across all sports and platforms
   */
  private async runRefresh(): Promise<void> {
    try {
      console.log('\n========================================');
      console.log('🔄 Running scheduled prop refresh...');
      console.log(`⏰ Time: ${new Date().toLocaleString()}`);
      console.log('========================================\n');

      // Refresh props for major sports
      const sports = ['NBA', 'NFL', 'NHL'];
      const result = await propRefreshService.refreshAllPlatforms(sports);

      this.lastRefreshTime = new Date();

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
    } catch (error) {
      console.error('❌ Scheduled prop refresh failed:', error);
    }
  }

  /**
   * Manually trigger a refresh (does not affect schedule)
   */
  async triggerManualRefresh(sports?: string[]): Promise<any> {
    console.log('🔄 Manual prop refresh triggered');
    const targetSports = sports || ['NBA', 'NFL', 'NHL'];
    const result = await propRefreshService.refreshAllPlatforms(targetSports);
    this.lastRefreshTime = new Date();
    return result;
  }
}

export const propSchedulerService = new PropSchedulerService();
