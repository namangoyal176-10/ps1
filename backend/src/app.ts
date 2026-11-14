import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { env } from './config/env.js';
import { apiLimiter } from './middleware/rateLimiter.js';
import { errorHandler } from './middleware/errorHandler.js';
import apiRouter from './routes/index.js';
import { prisma } from './config/prisma.js';

export function createApp() {
  const app = express();

  // Security headers
  app.use(
    helmet({
      crossOriginResourcePolicy: { policy: 'cross-origin' },
      crossOriginOpenerPolicy: { policy: 'same-origin-allow-popups' },
    })
  );

  // CORS configuration
  const allowedOrigins = [
    env.FRONTEND_URL,
    'http://localhost:5173',
    'http://localhost:3000',
    'http://127.0.0.1:5173',
  ];

  app.use(
    cors({
      origin: (origin, callback) => {
        // Allow requests with no origin (like mobile apps, curl, or Postman)
        if (!origin || allowedOrigins.includes(origin)) {
          return callback(null, true);
        }
        return callback(null, true); // Permissive in dev/test, restrict in strict prod
      },
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: [
        'Content-Type',
        'Authorization',
        'Idempotency-Key',
        'X-Idempotency-Key',
        'X-Requested-With',
      ],
      exposedHeaders: ['X-Cache-Lookup', 'X-Idempotency-Key'],
    })
  );

  // Request body parsing
  app.use(express.json({ limit: '2mb' }));
  app.use(express.urlencoded({ extended: true, limit: '2mb' }));
  app.use(cookieParser());

  // Global rate limiter
  app.use('/api', apiLimiter);

  // Healthcheck endpoint
  app.get('/health', async (req, res) => {
    try {
      await prisma.$queryRaw`SELECT 1`;
      res.status(200).json({
        status: 'UP',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        database: 'CONNECTED',
      });
    } catch (err: any) {
      res.status(503).json({
        status: 'DEGRADED',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        database: 'DISCONNECTED',
        error: err.message,
      });
    }
  });

  // Mount API router
  app.use('/api/v1', apiRouter);

  // 404 handler
  app.use((req, res) => {
    res.status(404).json({
      success: false,
      error: `Endpoint not found: ${req.method} ${req.originalUrl}`,
    });
  });

  // Centralized Error handler
  app.use(errorHandler);

  return app;
}
