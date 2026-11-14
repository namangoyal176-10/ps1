import { Router } from 'express';
import * as inviteController from '../controllers/inviteController.js';
import { authenticate } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { idempotency } from '../middleware/idempotency.js';
import { createInviteSchema, validateInviteQuerySchema } from '../validators/inviteValidator.js';

const router = Router();

router.post('/', authenticate, idempotency(), validate(createInviteSchema), inviteController.createInvite);
router.delete('/:id', authenticate, idempotency(), inviteController.revokeInvite);
router.get('/validate/:code', validate(validateInviteQuerySchema), inviteController.validateInvite);
router.get('/team/:teamId', authenticate, inviteController.getTeamInvites);

export default router;
