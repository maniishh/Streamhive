import { createClient } from 'redis';

let client = null;
let isRedisConnected = false;

/**
 * Initializes the Redis client and establishes the connection.
 * Handles connection errors and offline events gracefully to prevent app crashes.
 */
const initRedis = async () => {
    const host = process.env.REDIS_HOST || '127.0.0.1';
    const port = process.env.REDIS_PORT || 6379;
    const password = process.env.REDIS_PASSWORD || '';
    
    // Construct connection URL: supports credentials if provided
    const url = password 
        ? `redis://:${password}@${host}:${port}`
        : `redis://${host}:${port}`;

    console.log(`[Redis] Configuring client for host ${host}:${port}...`);

    client = createClient({
        url,
        socket: {
            reconnectStrategy: (retries) => {
                // Maximum reconnect delay is 3 seconds
                const delay = Math.min(retries * 100, 3000);
                console.warn(`[Redis] Connection lost. Reconnecting in ${delay}ms... (Attempt #${retries})`);
                return delay;
            }
        }
    });

    // Event Listeners
    client.on('error', (err) => {
        console.error(`[Redis] Error occurred:`, err.message);
        isRedisConnected = false;
    });

    client.on('connect', () => {
        console.log('[Redis] Client establishing connection...');
    });

    client.on('ready', () => {
        console.log('[Redis] Client connected successfully and ready.');
        isRedisConnected = true;
    });

    client.on('end', () => {
        console.warn('[Redis] Connection closed.');
        isRedisConnected = false;
    });

    try {
        await client.connect();
    } catch (err) {
        console.error('[Redis] Failed to connect to Redis server during startup:', err.message);
        isRedisConnected = false;
    }

    // Return the client instance for use in other modules
    return client;
};

/**
 * Fetches cached value by key.
 * @param {string} key Cache key
 * @returns {Promise<any|null>} Parsed value or null on cache miss / Redis failure
 */
const getCache = async (key) => {
    if (!client || !isRedisConnected) {
        console.warn(`[Redis] [Bypassed] Cache GET failed (Redis disconnected) for key: ${key}`);
        return null;
    }
    try {
        const data = await client.get(key);
        if (data !== null && data !== undefined) {
            console.log(`[Redis] [HIT] Key: ${key}`);
            return JSON.parse(data);
        }
        console.log(`[Redis] [MISS] Key: ${key}`);
        return null;
    } catch (error) {
        console.error(`[Redis] Error reading cache key "${key}":`, error.message);
        return null;
    }
};

/**
 * Caches a key-value pair with an expiration TTL.
 * @param {string} key Cache key
 * @param {any} value Value to store
 * @param {number} durationInSeconds Cache expiration duration (TTL)
 * @returns {Promise<boolean>} True if successful, false otherwise
 */
const setCache = async (key, value, durationInSeconds = 3600) => {
    if (!client || !isRedisConnected) {
        console.warn(`[Redis] [Bypassed] Cache SET failed (Redis disconnected) for key: ${key}`);
        return false;
    }
    try {
        const serialized = JSON.stringify(value);
        await client.set(key, serialized, {
            EX: durationInSeconds
        });
        console.log(`[Redis] [SET] Key: ${key} (TTL: ${durationInSeconds}s)`);
        return true;
    } catch (error) {
        console.error(`[Redis] Error setting cache key "${key}":`, error.message);
        return false;
    }
};

/**
 * Deletes a cached value by key.
 * @param {string} key Cache key
 * @returns {Promise<boolean>} True if successful, false otherwise
 */
const deleteCache = async (key) => {
    if (!client || !isRedisConnected) {
        console.warn(`[Redis] [Bypassed] Cache DEL failed (Redis disconnected) for key: ${key}`);
        return false;
    }
    try {
        await client.del(key);
        console.log(`[Redis] [DEL] Key: ${key}`);
        return true;
    } catch (error) {
        console.error(`[Redis] Error deleting cache key "${key}":`, error.message);
        return false;
    }
};

/**
 * Invalidates all cached keys matching a specific pattern.
 * Uses the non-blocking SCAN iterator to prevent thread blockages in production.
 * @param {string} pattern Glob-style pattern (e.g. "sh:feed:*")
 * @returns {Promise<boolean>} True if successful, false otherwise
 */
const invalidatePattern = async (pattern) => {
    if (!client || !isRedisConnected) {
        console.warn(`[Redis] [Bypassed] Cache Invalidation failed (Redis disconnected) for pattern: ${pattern}`);
        return false;
    }
    try {
        let deletedCount = 0;
        // Use scanIterator for memory efficiency and non-blocking key discovery
        for await (const key of client.scanIterator({ MATCH: pattern, COUNT: 100 })) {
            await client.del(key);
            deletedCount++;
        }
        if (deletedCount > 0) {
            console.log(`[Redis] [INVALIDATE] Pattern: ${pattern} (Cleared ${deletedCount} keys)`);
        }
        return true;
    } catch (error) {
        console.error(`[Redis] Error invalidating pattern "${pattern}":`, error.message);
        return false;
    }
};

export {
    initRedis,
    getCache,
    setCache,
    deleteCache,
    invalidatePattern,
    isRedisConnected
};

