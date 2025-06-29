import { Router } from 'express';
import { isAuthenticated } from '../middlewares/auth.middleware';
import { checkStatus, getWeather } from '../controllers/weather.controller';

const router = Router();

// Apply authentication middleware to weather routes
router.use(isAuthenticated);

// Weather routes
router.get('/status', checkStatus);
router.get('/:city', getWeather);

export default router; 