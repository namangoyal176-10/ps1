import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../types/index.js';
import { prisma } from '../config/prisma.js';
import { IDEMPOTENCY_TTL_SECONDS } from '../config/constants.js';

export function idempotency() {
  return async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    // Only apply to mutating HTTP methods
    if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) {
      return next();
    }

    const key = (req.headers['idempotency-key'] || req.headers['x-idempotency-key']) as string | undefined;

    if (!key || !req.user?.userId) {
      return next();
    }

    req.idempotencyKey = key;

    try {
      // Check existing record
      const existing = await prisma.idempotencyRecord.findUnique({
        where: { key },
      });

      if (existing) {
        if (new Date() < existing.expiresAt) {
          res.setHeader('X-Cache-Lookup', 'HIT');
          res.setHeader('X-Idempotency-Key', key);
          res.status(existing.statusCode).json(existing.responseBody);
          return;
        } else {
          // Expired, delete it
          await prisma.idempotencyRecord.delete({ where: { key } }).catch(() => {});
        }
      }

      // Intercept res.json to capture response
      const originalJson = res.json.bind(res);
      res.json = (body: any): Response => {
        // Only cache successful or non-server-error responses (status < 500)
        if (res.statusCode < 500) {
          const expiresAt = new Date(Date.now() + IDEMPOTENCY_TTL_SECONDS * 1000);
          prisma.idempotencyRecord
            .create({
              data: {
                key,
                userId: req.user!.userId,
                endpoint: req.originalUrl,
                statusCode: res.statusCode,
                responseBody: body,
                expiresAt,
              },
            })
            .catch((err) => {
              // Ignore duplicate key race insert
              if (process.env.NODE_ENV === 'development') {
                console.error('Idempotency record save error:', err);
              }
            });
        }
        res.setHeader('X-Cache-Lookup', 'MISS');
        res.setHeader('X-Idempotency-Key', key);
        return originalJson(body);
      };

      next();
    } catch (err) {
      // If error checking idempotency, proceed without blocking
      next();
    }
  };
}
