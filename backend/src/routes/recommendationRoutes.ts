import { Router } from 'express';
import * as recommendationController from '../controllers/recommendationController.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

router.get('/team/:teamId', authenticate, recommendationController.getTeammateRecommendations);
router.get('/user/teams', authenticate, recommendationController.getTeamRecommendations);

export default router;
