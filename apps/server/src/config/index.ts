import dotenv from 'dotenv';
dotenv.config();

export const config = {
  port: parseInt(process.env.PORT || '4000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  corsOrigin: process.env.CORS_ORIGIN || '*',
  rateLimitWindowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '60000', 10),
  rateLimitMaxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '120', 10),
  roomMaxPlayers: parseInt(process.env.ROOM_MAX_PLAYERS || '10', 10),
  roomMinPlayers: parseInt(process.env.ROOM_MIN_PLAYERS || '2', 10),
  reconnectTimeoutMs: parseInt(process.env.RECONNECT_TIMEOUT_MS || '120000', 10),
};
