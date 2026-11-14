import http from 'http';
import { Server as SocketIOServer } from 'socket.io';
import { createApp } from './app.js';
import { env } from './config/env.js';
import { logger } from './utils/logger.js';
import { initSocket } from './services/socketService.js';
import { prisma } from './config/prisma.js';

const app = createApp();
const server = http.createServer(app);

const io = new SocketIOServer(server, {
  cors: {
    origin: [env.FRONTEND_URL, 'http://localhost:5173', 'http://localhost:3000'],
    credentials: true,
  },
  pingTimeout: 60000,
});

initSocket(io);

const port = env.PORT || 5000;

server.listen(port, () => {
  logger.info(`🚀 RaceProof backend server running on port ${port} in ${env.NODE_ENV} mode`);
  logger.info(`👉 API Healthcheck: http://localhost:${port}/health`);
  logger.info(`👉 API Base: http://localhost:${port}/api/v1`);
});

// Graceful shutdown
async function gracefulShutdown(signal: string) {
  logger.info(`Received ${signal}. Shutting down gracefully...`);
  server.close(async () => {
    logger.info('HTTP server closed.');
    await prisma.$disconnect();
    logger.info('Database connection closed.');
    process.exit(0);
  });

  setTimeout(() => {
    logger.error('Could not close connections in time, forcefully shutting down');
    process.exit(1);
  }, 10000);
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

export { app, server };
