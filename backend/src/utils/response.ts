import { Response } from 'express';
import { ApiResponse } from '../types/index.js';

export function sendSuccess<T>(
  res: Response,
  data: T,
  message?: string,
  statusCode = 200,
  meta?: ApiResponse['meta']
): Response {
  const payload: ApiResponse<T> = {
    success: true,
    data,
    ...(message && { message }),
    ...(meta && { meta }),
  };
  return res.status(statusCode).json(payload);
}

export function sendError(
  res: Response,
  message: string,
  statusCode = 400,
  errorDetails?: any
): Response {
  const payload: ApiResponse = {
    success: false,
    error: message,
    ...(errorDetails && { details: errorDetails }),
  };
  return res.status(statusCode).json(payload);
}
