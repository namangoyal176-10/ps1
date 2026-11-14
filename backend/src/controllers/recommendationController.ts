import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../types/index.js';
import * as recommendationService from '../services/recommendationService.js';
import { sendSuccess } from '../utils/response.js';

export async function getTeammateRecommendations(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) {
  try {
    const limit = req.query.limit ? Number(req.query.limit) : 10;
    const recommendations = await recommendationService.getTeammateRecommendationsForTeam(
      req.params.teamId,
      limit
    );
    sendSuccess(res, recommendations);
  } catch (error) {
    next(error);
  }
}

export async function getTeamRecommendations(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) {
  try {
    const limit = req.query.limit ? Number(req.query.limit) : 10;
    const recommendations = await recommendationService.getTeamRecommendationsForUser(
      req.user!.userId,
      limit
    );
    sendSuccess(res, recommendations);
  } catch (error) {
    next(error);
  }
}
