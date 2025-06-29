import { Router } from 'express';
import { isAuthenticated } from '../middlewares/auth.middleware'; // Assuming all lead routes require authentication
import {
  importLeadsBatch,
  updateLeadsBatch,
  deleteLeadsBatch,
  getAllLeads,
  getLeadById,
  createLead,
  updateLead,
  deleteLead
} from '../controllers/lead.controller';

const router = Router();

// Apply authentication middleware to all lead routes
router.use(isAuthenticated);

// Batch operations
router.post('/batch/import', importLeadsBatch);
router.post('/batch/update', updateLeadsBatch);
router.post('/batch/delete', deleteLeadsBatch);

// Standard CRUD operations
router.get('/', getAllLeads);
router.post('/', createLead);
router.get('/:id', getLeadById);
router.patch('/:id', updateLead);
router.delete('/:id', deleteLead);

export default router; 