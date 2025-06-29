import { Router } from 'express';
import { isAuthenticated } from '../middlewares/auth.middleware'; // All stats should be authenticated
import { getStats } from '../controllers/stats.controller';

const router = Router();

// Apply authentication middleware
router.use(isAuthenticated);

// Define the route for getting all statistics
router.get('/', getStats);

export default router; 