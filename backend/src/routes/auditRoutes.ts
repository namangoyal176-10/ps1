import { Router } from 'express';
import * as auditController from '../controllers/auditController.js';

const router = Router();

router.get('/global', auditController.getGlobalAuditLogs);
router.get('/team/:teamId', auditController.getTeamAuditLogs);

export default router;
