import { Request, Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../types/index.js';
import * as authService from '../services/authService.js';
import { sendSuccess } from '../utils/response.js';
import { env } from '../config/env.js';

const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: env.COOKIE_SECURE,
  sameSite: 'lax' as const,
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
};

export async function register(req: Request, res: Response, next: NextFunction) {
  try {
    const { user, token } = await authService.registerUser(req.body);
    res.cookie('token', token, COOKIE_OPTIONS);
    sendSuccess(res, { user, token }, 'User registered successfully', 201);
  } catch (error) {
    next(error);
  }
}

export async function login(req: Request, res: Response, next: NextFunction) {
  try {
    const { user, token } = await authService.loginUser(req.body);
    res.cookie('token', token, COOKIE_OPTIONS);
    sendSuccess(res, { user, token }, 'Logged in successfully');
  } catch (error) {
    next(error);
  }
}

export async function logout(req: Request, res: Response) {
  res.clearCookie('token', COOKIE_OPTIONS);
  sendSuccess(res, { loggedOut: true }, 'Logged out successfully');
}

export async function me(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const user = await authService.getCurrentUser(req.user!.userId);
    sendSuccess(res, user);
  } catch (error) {
    next(error);
  }
}

export async function updateProfile(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const user = await authService.updateUserProfile(req.user!.userId, req.body);
    sendSuccess(res, user, 'Profile updated successfully');
  } catch (error) {
    next(error);
  }
}
