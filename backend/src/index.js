import dotenv from 'dotenv';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { app } from './app.js';
import connectDB from './db/index.js';
import { initSocket } from './utils/socket.js';

dotenv.config({ path: './env' });

connectDB()
  .then(() => {
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

    httpServer.listen(process.env.PORT || 8000, () => {
      console.log(`Server running on port ${process.env.PORT || 8000}`);
    });
  })
  .catch((err) => {
    console.error('Error connecting to DB:', err);
  });
