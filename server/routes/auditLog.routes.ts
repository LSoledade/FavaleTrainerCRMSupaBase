import { Router } from 'express';
import { isAdmin } from '../middlewares/auth.middleware';
import { getAuditLogs } from '../controllers/auditLog.controller';

const router = Router();

// Somente administradores podem acessar os logs de auditoria
router.get('/', isAdmin, getAuditLogs);

export default router; 