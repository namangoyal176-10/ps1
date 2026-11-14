import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../types/index.js';
import * as joinRequestService from '../services/joinRequestService.js';
import { sendSuccess } from '../utils/response.js';

export async function createJoinRequest(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const request = await joinRequestService.createJoinRequest(req.user!.userId, req.body);
    sendSuccess(res, request, 'Join request sent successfully', 201);
  } catch (error) {
    next(error);
  }
}

export async function acceptJoinRequest(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const result = await joinRequestService.acceptJoinRequest(req.user!.userId, req.params.id);
    sendSuccess(res, result, 'Join request accepted');
  } catch (error) {
    next(error);
  }
}

export async function declineJoinRequest(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const result = await joinRequestService.declineJoinRequest(req.user!.userId, req.params.id);
    sendSuccess(res, result, 'Join request declined');
  } catch (error) {
    next(error);
  }
}

export async function cancelJoinRequest(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const result = await joinRequestService.cancelJoinRequest(req.user!.userId, req.params.id);
    sendSuccess(res, result, 'Join request cancelled');
  } catch (error) {
    next(error);
  }
}

export async function getUserJoinRequests(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const requests = await joinRequestService.getUserJoinRequests(req.user!.userId);
    sendSuccess(res, requests);
  } catch (error) {
    next(error);
  }
}
