import { Router } from 'express';
import * as teamController from '../controllers/teamController.js';
import { authenticate, optionalAuth } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { idempotency } from '../middleware/idempotency.js';
import {
  createTeamSchema,
  updateTeamSchema,
  getTeamsQuerySchema,
  transferLeadershipSchema,
  kickMemberSchema,
} from '../validators/teamValidator.js';
import { joinWithCodeSchema } from '../validators/inviteValidator.js';

const router = Router();

router.get('/', validate(getTeamsQuerySchema), teamController.getTeams);
router.post('/', authenticate, idempotency(), validate(createTeamSchema), teamController.createTeam);
router.get('/:id', optionalAuth, teamController.getTeamById);
router.patch('/:id', authenticate, idempotency(), validate(updateTeamSchema), teamController.updateTeam);
router.post('/join-with-code', authenticate, idempotency(), validate(joinWithCodeSchema), teamController.joinWithCode);
router.post('/:id/leave', authenticate, idempotency(), teamController.leaveTeam);
router.post(
  '/:id/transfer-leadership',
  authenticate,
  idempotency(),
  validate(transferLeadershipSchema),
  teamController.transferLeadership
);
router.delete(
  '/:id/members/:userId',
  authenticate,
  idempotency(),
  validate(kickMemberSchema),
  teamController.kickMember
);

export default router;
