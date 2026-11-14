import { Request, Response, NextFunction } from 'express';
import * as auditService from '../services/auditService.js';
import { sendSuccess } from '../utils/response.js';

export async function getTeamAuditLogs(req: Request, res: Response, next: NextFunction) {
  try {
    const limit = req.query.limit ? Number(req.query.limit) : 50;
    const logs = await auditService.getTeamAuditLogs(req.params.teamId, limit);
    sendSuccess(res, logs);
  } catch (error) {
    next(error);
  }
}

export async function getGlobalAuditLogs(req: Request, res: Response, next: NextFunction) {
  try {
    const limit = req.query.limit ? Number(req.query.limit) : 100;
    const logs = await auditService.getGlobalAuditLogs(limit);
    sendSuccess(res, logs);
  } catch (error) {
    next(error);
  }
}
