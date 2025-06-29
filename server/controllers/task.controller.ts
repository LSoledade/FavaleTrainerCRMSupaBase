import type { Request, Response } from "express";
import { storage } from "../storage";
import { taskValidationSchema, taskCommentValidationSchema } from "@shared/schema";
import { addUserNamesToTasks } from "../utils/task.utils"; // Utility to add user names

// Listar todas as tarefas
export const getAllTasks = async (req: Request, res: Response) => {
  try {
    const tasks = await storage.getTasks();
    const tasksWithUserNames = await addUserNamesToTasks(tasks, storage);
    res.json(tasksWithUserNames);
  } catch (error) {
    console.error('Erro ao buscar tarefas:', error);
    res.status(500).json({ message: 'Erro ao buscar tarefas' });
  }
};

// Buscar tarefa pelo ID
export const getTaskById = async (req: Request, res: Response) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) {
    return res.status(400).json({ message: 'ID inválido' });
  }
  try {
    const task = await storage.getTask(id);
    if (!task) {
      return res.status(404).json({ message: 'Tarefa não encontrada' });
    }
    const assignedTo = await storage.getUser(task.assignedToId);
    const assignedBy = await storage.getUser(task.assignedById);
    const comments = await storage.getTaskCommentsByTaskId(id);
    const commentsWithUserInfo = await Promise.all(comments.map(async comment => {
      if (comment.userId) {
        const commentUser = await storage.getUser(comment.userId);
        return {
          ...comment,
          userName: commentUser?.username || 'Usuário não encontrado'
        };
      }
      return comment;
    }));
    res.json({
      ...task,
      assignedToName: assignedTo?.username || 'Usuário não encontrado',
      assignedByName: assignedBy?.username || 'Usuário não encontrado',
      comments: commentsWithUserInfo
    });
  } catch (error) {
    console.error(`Erro ao buscar tarefa ${id}:`, error);
    res.status(500).json({ message: 'Erro ao buscar detalhes da tarefa' });
  }
};

// Criar nova tarefa
export const createTask = async (req: Request, res: Response) => {
  try {
    const validatedData = taskValidationSchema.parse(req.body);
    if (validatedData.dueDate && !(validatedData.dueDate instanceof Date)) {
      validatedData.dueDate = new Date(validatedData.dueDate);
    }
    const newTask = await storage.createTask(validatedData);
    res.status(201).json(newTask);
  } catch (error: any) {
    if (error.name === 'ZodError') {
      return res.status(400).json({ 
        message: 'Dados inválidos', 
        details: error.errors 
      });
    }
    console.error('Erro ao criar tarefa:', error);
    res.status(500).json({ message: 'Erro ao criar tarefa' });
  }
};

// Atualizar tarefa existente
export const updateTask = async (req: Request, res: Response) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) {
    return res.status(400).json({ message: 'ID inválido' });
  }
  try {
    const existingTask = await storage.getTask(id);
    if (!existingTask) {
      return res.status(404).json({ message: 'Tarefa não encontrada' });
    }
    const validatedData = taskValidationSchema.partial().parse(req.body);
     if (validatedData.dueDate && typeof validatedData.dueDate === 'string') {
      validatedData.dueDate = new Date(validatedData.dueDate);
    }
    const updatedTask = await storage.updateTask(id, validatedData);
    res.json(updatedTask);
  } catch (error: any) {
    if (error.name === 'ZodError') {
      return res.status(400).json({ 
        message: 'Dados inválidos', 
        details: error.errors 
      });
    }
    console.error(`Erro ao atualizar tarefa ${id}:`, error);
    res.status(500).json({ message: 'Erro ao atualizar tarefa' });
  }
};

// Excluir tarefa
export const deleteTask = async (req: Request, res: Response) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) {
    return res.status(400).json({ message: 'ID inválido' });
  }
  try {
    const existingTask = await storage.getTask(id);
    if (!existingTask) {
      return res.status(404).json({ message: 'Tarefa não encontrada' });
    }
    const deleted = await storage.deleteTask(id);
    if (deleted) {
      res.status(204).end();
    } else {
      res.status(500).json({ message: 'Erro ao excluir tarefa' });
    }
  } catch (error) {
    console.error(`Erro ao excluir tarefa ${id}:`, error);
    res.status(500).json({ message: 'Erro ao excluir tarefa' });
  }
};

// Buscar tarefas por usuário designado
export const getTasksByAssignedTo = async (req: Request, res: Response) => {
  const userId = parseInt(req.params.userId);
  if (isNaN(userId)) {
    return res.status(400).json({ message: 'ID de usuário inválido' });
  }
  try {
    const tasks = await storage.getTasksByAssignedToId(userId);
    const tasksWithUserNames = await addUserNamesToTasks(tasks, storage);
    res.json(tasksWithUserNames);
  } catch (error) {
    console.error(`Erro ao buscar tarefas atribuídas ao usuário ${userId}:`, error);
    res.status(500).json({ message: 'Erro ao buscar tarefas' });
  }
};

// Buscar tarefas por status
export const getTasksByStatus = async (req: Request, res: Response) => {
  const { status } = req.params;
  if (!['backlog', 'pending', 'in_progress', 'completed', 'cancelled'].includes(status)) {
    return res.status(400).json({ message: 'Status inválido' });
  }
  try {
    const tasks = await storage.getTasksByStatus(status);
    const tasksWithUserNames = await addUserNamesToTasks(tasks, storage);
    res.json(tasksWithUserNames);
  } catch (error) {
    console.error(`Erro ao buscar tarefas com status ${status}:`, error);
    res.status(500).json({ message: 'Erro ao buscar tarefas' });
  }
};

// Adicionar comentário a uma tarefa
export const addTaskComment = async (req: Request, res: Response) => {
  const taskId = parseInt(req.params.id);
  if (isNaN(taskId)) {
    return res.status(400).json({ message: 'ID de tarefa inválido' });
  }
  try {
    const existingTask = await storage.getTask(taskId);
    if (!existingTask) {
      return res.status(404).json({ message: 'Tarefa não encontrada' });
    }
    const validatedData = taskCommentValidationSchema.parse({
      ...req.body,
      taskId // Ensure taskId from param is used
    });
    const newComment = await storage.createTaskComment(validatedData);
     // Fetch user info for the new comment to return it with userName
    let commentWithUser = { ...newComment, userName: 'Usuário não encontrado' };
    if (newComment.userId) {
        const commentUser = await storage.getUser(newComment.userId);
        if (commentUser) {
            commentWithUser.userName = commentUser.username;
        }
    }
    res.status(201).json(commentWithUser);
  } catch (error: any) {
    if (error.name === 'ZodError') {
      return res.status(400).json({ 
        message: 'Dados inválidos', 
        details: error.errors 
      });
    }
    console.error(`Erro ao adicionar comentário à tarefa ${taskId}:`, error);
    res.status(500).json({ message: 'Erro ao adicionar comentário' });
  }
};

// Excluir comentário
export const deleteTaskComment = async (req: Request, res: Response) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) {
    return res.status(400).json({ message: 'ID inválido' });
  }
  try {
    // Optionally, verify if comment exists before deleting or if user has permission
    const deleted = await storage.deleteTaskComment(id);
    if (deleted) {
      res.status(204).end();
    } else {
      // This case could mean comment not found or other DB error
      res.status(404).json({ message: 'Comentário não encontrado ou erro ao excluir' });
    }
  } catch (error) {
    console.error(`Erro ao excluir comentário ${id}:`, error);
    res.status(500).json({ message: 'Erro ao excluir comentário' });
  }
}; 