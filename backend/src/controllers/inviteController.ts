import { Request, Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../types/index.js';
import * as inviteService from '../services/inviteService.js';
import { sendSuccess } from '../utils/response.js';

export async function createInvite(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const invite = await inviteService.createTeamInvite(req.user!.userId, req.body);
    sendSuccess(res, invite, 'Invitation code generated', 201);
  } catch (error) {
    next(error);
  }
}

export async function revokeInvite(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const invite = await inviteService.revokeTeamInvite(req.user!.userId, req.params.id);
    sendSuccess(res, invite, 'Invitation revoked successfully');
  } catch (error) {
    next(error);
  }
}

export async function validateInvite(req: Request, res: Response, next: NextFunction) {
  try {
    const details = await inviteService.validateInviteCode(req.params.code);
    sendSuccess(res, details);
  } catch (error) {
    next(error);
  }
}

export async function getTeamInvites(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const invites = await inviteService.getTeamInvites(req.user!.userId, req.params.teamId);
    sendSuccess(res, invites);
  } catch (error) {
    next(error);
  }
}
