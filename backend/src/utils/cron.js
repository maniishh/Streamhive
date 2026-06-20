import cron from 'node-cron';
import { syncViewsToDatabase, forceSyncViews } from './viewCounter.js';

let cronJob = null;
const SYNC_INTERVAL = '*/5 * * * *'; // Every 5 minutes

/**
 * Initialize the cron job for batch syncing views from Redis to MongoDB.
 * 
 * Schedule: Every 5 minutes
 * Task: Sync accumulated view counts from Redis to MongoDB
 * 
 * This prevents excessive MongoDB writes and improves performance
 * while ensuring views are synced within a short time window.
 */
const initCronJobs = async () => {
  try {
    console.log('[CronJobs] Initializing view sync cron job...');

    cronJob = cron.schedule(SYNC_INTERVAL, async () => {
      console.log(`[CronJobs] Running view sync task at ${new Date().toISOString()}`);
      try {
        const stats = await syncViewsToDatabase();
        if (stats.synced > 0 || stats.total > 0) {
          console.log(
            `[CronJobs] Sync stats - Synced: ${stats.synced}, Total views: ${stats.total}, Duration: ${stats.duration}ms`
          );
        }
      } catch (error) {
        console.error('[CronJobs] Error running sync task:', error.message);
        // Don't throw - allow cron to continue running
      }
    });

    console.log('[CronJobs] View sync cron job initialized successfully');
  } catch (error) {
    console.error('[CronJobs] Error initializing cron jobs:', error.message);
    throw error;
  }
};

/**
 * Graceful shutdown: Force sync all pending views and stop cron jobs.
 * Should be called before server shutdown to prevent data loss.
 */
const stopCronJobs = async () => {
  if (cronJob) {
    console.log('[CronJobs] Stopping cron jobs and forcing final sync...');
    
    // Stop the cron job from running any more tasks
    cronJob.stop();
    
    // Force sync any remaining views
    await forceSyncViews();
    
    console.log('[CronJobs] Cron jobs stopped successfully');
  }
};

export {
  initCronJobs,
  stopCronJobs,
};
