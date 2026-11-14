import { Router } from 'express';
import authRoutes from './authRoutes.js';
import teamRoutes from './teamRoutes.js';
import inviteRoutes from './inviteRoutes.js';
import joinRequestRoutes from './joinRequestRoutes.js';
import recommendationRoutes from './recommendationRoutes.js';
import auditRoutes from './auditRoutes.js';

const apiRouter = Router();

apiRouter.use('/auth', authRoutes);
apiRouter.use('/teams', teamRoutes);
apiRouter.use('/invites', inviteRoutes);
apiRouter.use('/join-requests', joinRequestRoutes);
apiRouter.use('/recommendations', recommendationRoutes);
apiRouter.use('/audit', auditRoutes);

export default apiRouter;
