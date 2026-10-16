import http from 'http';
import fs from 'fs';
import path from 'path';
import cors from 'cors';
import express from 'express';
import { Server } from 'socket.io';
import { ClientToServerEvents, ServerToClientEvents } from '@uno-arena/shared';
import { createApiRouter } from './api/routes';
import { config } from './config';
import { RoomManager } from './rooms/RoomManager';
import { SimpleRateLimiter } from './security/rateLimiter';
import { registerSocketHandlers } from './socket/handlers';

export function createCorsOriginValidator(corsOriginSetting: string) {
  if (corsOriginSetting === '*' || !corsOriginSetting) {
    return true;
  }

  const allowedList = corsOriginSetting
    .split(',')
    .map((s) => s.trim().replace(/\/$/, ''))
    .filter(Boolean);

  return (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
    if (!origin) return callback(null, true);

    const cleanOrigin = origin.replace(/\/$/, '');
    if (allowedList.includes('*') || allowedList.includes(cleanOrigin)) {
      return callback(null, true);
    }

    if (cleanOrigin === 'http://localhost:5173' || cleanOrigin === 'http://127.0.0.1:5173') {
      return callback(null, true);
    }

    try {
      const url = new URL(cleanOrigin);
      if (url.hostname.endsWith('.vercel.app')) {
        return callback(null, true);
      }
    } catch {}

    return callback(null, false);
  };
}

export const corsOriginValidator = createCorsOriginValidator(config.corsOrigin);

export const app = express();
app.use(
  cors({
    origin: corsOriginValidator,
    credentials: true,
  })
);
app.use(express.json());

export const roomManager = new RoomManager();
export const rateLimiter = new SimpleRateLimiter(
  config.rateLimitWindowMs,
  config.rateLimitMaxRequests
);

// REST API routes
app.use(createApiRouter(roomManager));

// In production or full-stack mode, serve static client assets if built
const possibleClientPaths = [
  path.resolve(process.cwd(), 'apps/client/dist'),
  path.resolve(__dirname, '../../client/dist'),
  path.resolve(__dirname, '../client/dist'),
];
const clientDistPath = possibleClientPaths.find((p) => fs.existsSync(p));

if (clientDistPath) {
  app.use(express.static(clientDistPath));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api') || req.path.startsWith('/socket.io')) {
      return next();
    }
    res.sendFile(path.join(clientDistPath, 'index.html'));
  });
}

export const server = http.createServer(app);

export const io = new Server<ClientToServerEvents, ServerToClientEvents>(server, {
  cors: {
    origin: corsOriginValidator,
    methods: ['GET', 'POST'],
    credentials: true,
  },
});

registerSocketHandlers(io, roomManager, rateLimiter);

// Only listen if this file is run directly (not during vitest tests)
if (process.env.NODE_ENV !== 'test') {
  server.listen(config.port, '0.0.0.0', () => {
    console.log(`[UNO Arena Server] Listening on http://0.0.0.0:${config.port}`);
  });
}
