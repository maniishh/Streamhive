import dotenv from 'dotenv';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { app } from './app.js';
import connectDB from './db/index.js';
import { initSocket } from './utils/socket.js';

dotenv.config({ path: './env' });

connectDB()
  .then(() => {
    const httpServer = createServer(app);

    // ── Socket.io ─────────────────────────────────────────────────────────
    // allowEIO3: true  — accept older Engine.IO clients
    // pingTimeout / pingInterval — keep free-tier Render connections alive
    const io = new Server(httpServer, {
      cors: {
        origin: process.env.CORS_ORIGIN
          ? process.env.CORS_ORIGIN.split(',').map(s => s.trim())
          : '*',
        methods: ['GET', 'POST'],
        credentials: true,
      },
      allowEIO3: true,
      // These two prevent Render's 30-second idle timeout from killing sockets
      pingTimeout: 25000,
      pingInterval: 10000,
      // Allow both transports — client starts with polling, upgrades to ws
      transports: ['polling', 'websocket'],
    });

    initSocket(io);

    httpServer.listen(process.env.PORT || 8000, () => {
      console.log(`Server running on port ${process.env.PORT || 8000}`);
    });
  })
  .catch((err) => {
    console.error('Error connecting to DB:', err);
  });
