import dotenv from 'dotenv';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { app } from './app.js';
import connectDB from './db/index.js';
import { initSocket } from './utils/socket.js';
import { initRedis } from './utils/redis.js';
import { initViewCounter, forceSyncViews } from './utils/viewCounter.js';
import { initCronJobs, stopCronJobs } from './utils/cron.js';

dotenv.config({ path: './env' });

connectDB()
  .then(async () => {
    // Initialize Redis Caching Layer
    const redisClient = await initRedis();

    // Initialize View Counter with Redis client
    await initViewCounter(redisClient);

    const httpServer = createServer(app);  // ← wrap express in http server

    const io = new Server(httpServer, {
      cors: {
        origin: process.env.CORS_ORIGIN
          ? process.env.CORS_ORIGIN.split(',').map(s => s.trim())
          : '*',
        methods: ['GET', 'POST'],
        credentials: true,
      },
      allowEIO3: true,
      pingTimeout: 25000,
      pingInterval: 10000,
      transports: ['polling', 'websocket'],  // polling first — works on Render
    });

    initSocket(io);

    // Initialize cron jobs for batch view syncing
    await initCronJobs();

    const server = httpServer.listen(process.env.PORT || 8000, () => {
      console.log(`Server running on port ${process.env.PORT || 8000}`);
    });

    // ── Graceful Shutdown ────────────────────────────────────────────────────
    // Ensures no pending views are lost when server shuts down
    const gracefulShutdown = async (signal) => {
      console.log(`\n[Server] Received ${signal}. Starting graceful shutdown...`);
      
      // Stop accepting new requests
      server.close(async () => {
        try {
          // Stop cron jobs and force sync all pending views
          await stopCronJobs();
          
          console.log('[Server] Graceful shutdown completed');
          process.exit(0);
        } catch (error) {
          console.error('[Server] Error during graceful shutdown:', error);
          process.exit(1);
        }
      });

      // Forcefully exit after timeout (30 seconds)
      setTimeout(() => {
        console.error('[Server] Forced shutdown after 30 second timeout');
        process.exit(1);
      }, 30000);
    };

    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));
  })
  .catch((err) => {
    console.error('Error connecting to DB:', err);
  });

