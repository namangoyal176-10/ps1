import { Request, Response, NextFunction } from 'express';
import { AppError } from '../utils/errors.js';
import { logger } from '../utils/logger.js';
import { ZodError } from 'zod';
import { Prisma } from '@prisma/client';

export function errorHandler(
  err: Error,
  req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  next: NextFunction
): void {
  // Handle AppError
  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      success: false,
      error: err.message,
    });
    return;
  }

  // Handle Zod validation errors
  if (err instanceof ZodError) {
    const messages = err.errors.map((e) => `${e.path.join('.')}: ${e.message}`).join(', ');
    res.status(400).json({
      success: false,
      error: `Validation error: ${messages}`,
      details: err.flatten(),
    });
    return;
  }

  // Handle Prisma unique constraint violations (e.g., P2002)
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === 'P2002') {
      const target = (err.meta?.target as string[])?.join(', ') || 'field';
      res.status(409).json({
        success: false,
        error: `Conflict: A record with this ${target} already exists.`,
      });
      return;
    }
    if (err.code === 'P2025') {
      res.status(404).json({
        success: false,
        error: 'Record not found.',
      });
      return;
    }
  }

  // Unhandled internal errors
  logger.error('Unhandled server error:', err);
  res.status(500).json({
    success: false,
    error: 'Internal server error occurred.',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack, details: err.message }),
  });
}
