import { Router } from 'express';
import * as joinRequestController from '../controllers/joinRequestController.js';
import { authenticate } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { idempotency } from '../middleware/idempotency.js';
import { createJoinRequestSchema, handleJoinRequestSchema } from '../validators/joinRequestValidator.js';

const router = Router();

router.get('/my-requests', authenticate, joinRequestController.getUserJoinRequests);
router.post('/', authenticate, idempotency(), validate(createJoinRequestSchema), joinRequestController.createJoinRequest);
router.post(
  '/:id/accept',
  authenticate,
  idempotency(),
  validate(handleJoinRequestSchema),
  joinRequestController.acceptJoinRequest
);
router.post(
  '/:id/decline',
  authenticate,
  idempotency(),
  validate(handleJoinRequestSchema),
  joinRequestController.declineJoinRequest
);
router.delete(
  '/:id',
  authenticate,
  idempotency(),
  validate(handleJoinRequestSchema),
  joinRequestController.cancelJoinRequest
);

export default router;
