import { Request } from 'express';
import { MemberRole, TeamStatus, RequestStatus, AuditAction } from '@prisma/client';

export interface JwtPayload {
  userId: string;
  email: string;
  username: string;
}

export interface AuthenticatedRequest extends Request {
  user?: JwtPayload;
  idempotencyKey?: string;
}

export interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  data?: T;
  meta?: {
    page?: number;
    limit?: number;
    total?: number;
    totalPages?: number;
    [key: string]: any;
  };
  error?: string;
}
