import { Video } from '../models/video.model.js';
import { isRedisReady } from './redis.js';

let redisClient = null;

/**
 * Initialize the view counter module with a Redis client instance.
 * Called from index.js to pass the Redis client.
 * @param {object} client - Redis client instance
 */
const initViewCounter = async (client) => {
  redisClient = client;
  console.log('[ViewCounter] Initialized with Redis client');
};

/**
 * Atomically increments the view count for a video in Redis.
 * Falls back to direct MongoDB update if Redis is unavailable.
 * @param {string} videoId - MongoDB ObjectId of the video
 * @returns {Promise<number|null>} The new view count
 */
const incrementViewInRedis = async (videoId) => {
  if (!redisClient || !isRedisReady()) {
    try {
      await Video.findByIdAndUpdate(videoId, { $inc: { views: 1 } });
      return 1;
    } catch (dbErr) {
      console.error(`[ViewCounter] Direct DB update failed for video ${videoId}:`, dbErr.message);
      return null;
    }
  }

  try {
    const key = `views:${videoId}`;
    const newCount = await redisClient.incr(key);
    
    // Set expiration on the key (48 hours) to clean up if sync fails
    await redisClient.expire(key, 172800); // 48 hours in seconds
    
    return newCount;
  } catch (error) {
    console.error(`[ViewCounter] Error incrementing view in Redis for video ${videoId}:`, error.message);
    // Fallback to direct MongoDB update on Redis failure
    try {
      await Video.findByIdAndUpdate(videoId, { $inc: { views: 1 } });
    } catch (dbErr) {
      console.error(`[ViewCounter] Direct DB fallback update failed for video ${videoId}:`, dbErr.message);
    }
    return null;
  }
};

/**
 * Batch sync all accumulated view counts from Redis to MongoDB.
 * Runs periodically (default: every 5 minutes via cron job).
 */
const syncViewsToDatabase = async () => {
  if (!redisClient || !isRedisReady()) {
    return { synced: 0, failed: 0, total: 0, timestamp: new Date() };
  }

  const startTime = Date.now();
  const stats = {
    synced: 0,
    failed: 0,
    total: 0,
    timestamp: new Date(),
    duration: 0,
  };

  try {
    console.log('[ViewCounter] Starting batch view sync from Redis to MongoDB...');

    const bulkOps = [];
    const keysToDelete = [];

    // Scan Redis for all view counter keys efficiently using iterator
    for await (const key of redisClient.scanIterator({
      MATCH: 'views:*',
      COUNT: 100, // Scan in batches of 100 to be memory efficient
    })) {
      try {
        // Extract videoId from key (format: views:${videoId})
        const videoId = key.split(':')[1];
        
        // Get the accumulated view count from Redis
        const viewCountStr = await redisClient.get(key);
        const viewCount = parseInt(viewCountStr, 10) || 0;

        if (viewCount > 0) {
          // Prepare MongoDB bulk update operation
          bulkOps.push({
            updateOne: {
              filter: { _id: videoId },
              update: { $inc: { views: viewCount } },
            },
          });

          // Mark this key for deletion after successful sync
          keysToDelete.push(key);
          stats.total += viewCount;
        }
      } catch (err) {
        console.error(`[ViewCounter] Error processing key ${key}:`, err.message);
        stats.failed++;
      }
    }

    // Execute bulk updates if there are any operations
    if (bulkOps.length > 0) {
      try {
        const result = await Video.collection.bulkWrite(bulkOps, { ordered: false });
        stats.synced = result.modifiedCount;
        console.log(`[ViewCounter] Bulk sync successful: ${result.modifiedCount} videos updated`);
      } catch (error) {
        console.error('[ViewCounter] Bulk write error:', error.message);
        stats.failed = bulkOps.length;
        stats.synced = 0;
        // Return early without deleting keys (ensures no data loss)
        stats.duration = Date.now() - startTime;
        console.log(
          `[ViewCounter] Sync completed with failures. Stats:`,
          stats
        );
        return stats;
      }
    }

    // Only delete Redis keys AFTER successful MongoDB sync
    if (keysToDelete.length > 0) {
      try {
        await redisClient.del(keysToDelete);
        console.log(`[ViewCounter] Cleaned up ${keysToDelete.length} Redis keys after sync`);
      } catch (error) {
        console.warn(
          `[ViewCounter] Error deleting Redis keys after sync (data NOT lost):`,
          error.message
        );
      }
    }

    stats.duration = Date.now() - startTime;
    console.log(
      `[ViewCounter] Sync completed successfully. Total views synced: ${stats.total}, Duration: ${stats.duration}ms`
    );

    return stats;
  } catch (error) {
    console.error('[ViewCounter] Unexpected error during sync:', error.message);
    stats.duration = Date.now() - startTime;
    return stats;
  }
};

/**
 * Get the pending view count for a video from Redis.
 * Useful for monitoring and debugging.
 * @param {string} videoId - MongoDB ObjectId of the video
 * @returns {Promise<number>} Pending view count or 0
 */
const getPendingViews = async (videoId) => {
  if (!redisClient || !isRedisReady()) return 0;
  
  try {
    const key = `views:${videoId}`;
    const count = await redisClient.get(key);
    return parseInt(count, 10) || 0;
  } catch (error) {
    console.error(`[ViewCounter] Error getting pending views for ${videoId}:`, error.message);
    return 0;
  }
};

/**
 * Get all pending view counts (for monitoring/debugging).
 * @returns {Promise<object>} Map of { videoId: pendingCount }
 */
const getAllPendingViews = async () => {
  if (!redisClient || !isRedisReady()) return {};
  
  const pending = {};
  try {
    for await (const key of redisClient.scanIterator({
      MATCH: 'views:*',
      COUNT: 100,
    })) {
      const videoId = key.split(':')[1];
      const count = await redisClient.get(key);
      pending[videoId] = parseInt(count, 10) || 0;
    }
  } catch (error) {
    console.error('[ViewCounter] Error getting all pending views:', error.message);
  }
  
  return pending;
};

/**
 * Force sync all views immediately (used for graceful shutdown).
 * @returns {Promise<void>}
 */
const forceSyncViews = async () => {
  console.log('[ViewCounter] Force syncing all pending views...');
  const stats = await syncViewsToDatabase();
  console.log('[ViewCounter] Force sync complete:', stats);
};

export {
  initViewCounter,
  incrementViewInRedis,
  syncViewsToDatabase,
  getPendingViews,
  getAllPendingViews,
  forceSyncViews,
};
