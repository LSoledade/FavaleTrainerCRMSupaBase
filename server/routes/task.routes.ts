import { Router } from 'express';
import { isAuthenticated, isAdmin } from '../middlewares/auth.middleware';
import {
  getAllTasks,
  getTaskById,
  createTask,
  updateTask,
  deleteTask,
  getTasksByAssignedTo,
  getTasksByStatus,
  addTaskComment,
  deleteTaskComment
} from '../controllers/task.controller';

const router = Router();

// Apply authentication middleware to all task routes
router.use(isAuthenticated);

// Task specific routes
router.get('/assigned-to/:userId', getTasksByAssignedTo);
router.get('/status/:status', getTasksByStatus);

// Task CRUD
router.get('/', getAllTasks);
router.post('/', createTask);
router.get('/:id', getTaskById);
router.patch('/:id', updateTask);
router.delete('/:id', isAdmin, deleteTask); // Only admins can delete tasks

// Task Comment routes
router.post('/:id/comments', addTaskComment);
router.delete('/comments/:id', deleteTaskComment); // Note the path for deleting comments

export default router; 