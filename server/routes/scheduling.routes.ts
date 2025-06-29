import { Router } from 'express';
import { 
  getAppointments, 
  createAppointment, 
  updateAppointment, 
  deleteAppointment,
  createRecurringAppointments,
  updateAppointmentStatus,
  deleteRecurringGroup
} from '../controllers/scheduling.controller';
import { isAuthenticated } from '../middlewares/auth.middleware';

const router = Router();

router.use(isAuthenticated);

router.get('/', getAppointments);
router.post('/', createAppointment);
router.put('/:id', updateAppointment);
router.delete('/:id', deleteAppointment);
router.patch('/:id/status', updateAppointmentStatus);
router.post('/recurring', createRecurringAppointments);
router.delete('/recurring/:groupId', deleteRecurringGroup);

export default router;