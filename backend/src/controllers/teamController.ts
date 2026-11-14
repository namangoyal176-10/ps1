import { Request, Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../types/index.js';
import * as teamService from '../services/teamService.js';
import { sendSuccess } from '../utils/response.js';

export async function createTeam(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const team = await teamService.createTeam(req.user!.userId, req.body);
    sendSuccess(res, team, 'Team created successfully', 201);
  } catch (error) {
    next(error);
  }
}

export async function getTeams(req: Request, res: Response, next: NextFunction) {
  try {
    const { teams, meta } = await teamService.getTeams(req.query as any);
    sendSuccess(res, teams, undefined, 200, meta);
  } catch (error) {
    next(error);
  }
}

export async function getTeamById(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const team = await teamService.getTeamById(req.params.id, req.user?.userId);
    sendSuccess(res, team);
  } catch (error) {
    next(error);
  }
}

export async function updateTeam(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const team = await teamService.updateTeam(req.params.id, req.user!.userId, req.body);
    sendSuccess(res, team, 'Team updated successfully');
  } catch (error) {
    next(error);
  }
}

export async function leaveTeam(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const result = await teamService.leaveTeam(req.user!.userId, req.params.id);
    sendSuccess(res, result, result.message);
  } catch (error) {
    next(error);
  }
}

export async function transferLeadership(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const result = await teamService.transferLeadership(
      req.user!.userId,
      req.params.id,
      req.body.targetUserId
    );
    sendSuccess(res, result, 'Leadership transferred successfully');
  } catch (error) {
    next(error);
  }
}

export async function kickMember(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const result = await teamService.kickMember(
      req.user!.userId,
      req.params.id,
      req.params.userId
    );
    sendSuccess(res, result, 'Member removed from team');
  } catch (error) {
    next(error);
  }
}

export async function joinWithCode(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const result = await teamService.joinTeamWithInviteCode(req.user!.userId, req.body.code);
    sendSuccess(res, result, 'Successfully joined the team!');
  } catch (error) {
    next(error);
  }
}
