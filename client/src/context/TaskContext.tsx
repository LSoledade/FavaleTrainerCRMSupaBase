import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from "react";
import { useToast } from "@/components/ui/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";

interface Task {
  id: number;
  title: string;
  description?: string;
  assignedById: number;
  assignedToId: number;
  assignedByName?: string;
  assignedToName?: string;
  dueDate?: Date;
  priority: "low" | "medium" | "high";
  status: "backlog" | "pending" | "in_progress" | "completed" | "cancelled";
  // No longer using relatedLeadId and relatedLeadName
  // Tasks are now assigned to system users only
  createdAt: Date;
  updatedAt: Date;
  comments?: TaskComment[];
}

interface TaskComment {
  id: number;
  taskId: number;
  userId: number;
  userName?: string;
  content: string;
  createdAt: Date;
  updatedAt: Date;
}

interface TaskContextType {
  tasks: Task[];
  loading: boolean;
  error: string | null;
  fetchTasks: () => Promise<void>;
  fetchTaskById: (id: number) => Promise<Task | undefined>;
  createTask: (task: Omit<Task, "id" | "createdAt" | "updatedAt" | "comments">) => Promise<Task>;
  updateTask: (id: number, task: Partial<Task>) => Promise<Task>;
  deleteTask: (id: number) => Promise<boolean>;
  addComment: (taskId: number, content: string) => Promise<TaskComment>;
  addTaskComment: (taskId: number, comment: Partial<TaskComment>) => Promise<TaskComment>;
  deleteTaskComment: (commentId: number) => Promise<boolean>;
  myTasks: Task[];
  assignedTasks: Task[];
  completedTasks: Task[];
}

const TaskContext = createContext<TaskContextType | undefined>(undefined);

interface TaskProviderProps {
  children: ReactNode;
}

export const TaskProvider = ({ children }: TaskProviderProps) => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();
  const { user } = useAuth();

  // Carregar tarefas ao inicializar
  const fetchTasks = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/tasks');
      if (!response.ok) {
        throw new Error(`Erro ao buscar tarefas: ${response.status}`);
      }
      
      const data = await response.json();
      
      // Converter datas de string para Date
      const processedTasks = data.map((task: any) => ({
        ...task,
        dueDate: task.dueDate ? new Date(task.dueDate) : undefined,
        createdAt: new Date(task.createdAt),
        updatedAt: new Date(task.updatedAt),
        comments: task.comments?.map((comment: any) => ({
          ...comment,
          createdAt: new Date(comment.createdAt),
          updatedAt: new Date(comment.updatedAt),
        })),
      }));
      
      setTasks(processedTasks);
      setLoading(false);
    } catch (err) {
      console.error("Erro ao carregar tarefas:", err);
      setError("Erro ao carregar tarefas");
      setLoading(false);
      
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Não foi possível carregar as tarefas.",
      });
    }
  }, [toast]);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  const fetchTaskById = useCallback(async (id: number) => {
    try {
      const response = await fetch(`/api/tasks/${id}`);
      if (!response.ok) {
        throw new Error(`Erro ao buscar tarefa: ${response.status}`);
      }
      
      const task = await response.json();
      
      // Converter datas de string para Date
      const processedTask = {
        ...task,
        dueDate: task.dueDate ? new Date(task.dueDate) : undefined,
        createdAt: new Date(task.createdAt),
        updatedAt: new Date(task.updatedAt),
        comments: task.comments?.map((comment: any) => ({
          ...comment,
          createdAt: new Date(comment.createdAt),
          updatedAt: new Date(comment.updatedAt),
        })),
      };
      
      return processedTask;
    } catch (err) {
      console.error("Erro ao carregar detalhes da tarefa:", err);
      setError("Erro ao carregar detalhes da tarefa");
      
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Não foi possível carregar os detalhes da tarefa.",
      });
      
      return undefined;
    }
  }, [toast]);

  const createTask = useCallback(async (task: Omit<Task, "id" | "createdAt" | "updatedAt" | "comments">) => {
    try {
      const response = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(task)
      });
      
      if (!response.ok) {
        throw new Error(`Erro ao criar tarefa: ${response.status}`);
      }
      
      const data = await response.json();
      
      // Converter datas de string para Date
      const newTask = {
        ...data,
        dueDate: data.dueDate ? new Date(data.dueDate) : undefined,
        createdAt: new Date(data.createdAt),
        updatedAt: new Date(data.updatedAt),
        comments: data.comments?.map((comment: any) => ({
          ...comment,
          createdAt: new Date(comment.createdAt),
          updatedAt: new Date(comment.updatedAt),
        })) || [],
      };
      
      // Atualizar estado local
      setTasks(prev => [...prev, newTask]);
      
      toast({
        title: "Sucesso",
        description: "Tarefa criada com sucesso.",
      });
      
      return newTask;
    } catch (err) {
      console.error("Erro ao criar tarefa:", err);
      setError("Erro ao criar tarefa");
      
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Não foi possível criar a tarefa.",
      });
      
      throw err;
    }
  }, [toast]);

  const updateTask = useCallback(async (id: number, taskUpdate: Partial<Task>) => {
    try {
      const response = await fetch(`/api/tasks/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(taskUpdate)
      });
      
      if (!response.ok) {
        // Tenta obter detalhes do erro do backend
        let errorDetail = '';
        try {
          // Tenta JSON
          const errorData = await response.json();
          errorDetail = errorData.message || errorData.details || '';
        } catch (jsonError) {
          // Se não for JSON, tenta texto puro
          try {
            const text = await response.text();
            errorDetail = text || `${response.status}`;
          } catch {
            errorDetail = `${response.status}`;
          }
        }
        console.error(`Server error response: ${errorDetail}`);
        throw new Error(`Erro ao atualizar tarefa: ${errorDetail}`);
      }
      
      // Tentar processar a resposta com tratamento de erro robusto
      let data;
      try {
        const text = await response.text();
        data = text ? JSON.parse(text) : {};
      } catch (parseError) {
        console.error("Erro ao processar resposta JSON:", parseError);
        throw new Error("Formato de resposta inválido do servidor");
      }
      
      // Converter datas de string para Date com tratamento de valores inválidos
      const updatedTask = {
        ...data,
        dueDate: data.dueDate ? new Date(data.dueDate) : undefined,
        createdAt: data.createdAt ? new Date(data.createdAt) : new Date(),
        updatedAt: data.updatedAt ? new Date(data.updatedAt) : new Date(),
        comments: Array.isArray(data.comments) 
          ? data.comments.map((comment: any) => ({
              ...comment,
              createdAt: comment.createdAt ? new Date(comment.createdAt) : new Date(),
              updatedAt: comment.updatedAt ? new Date(comment.updatedAt) : new Date(),
            }))
          : [],
      };
      
      // Atualizar estado local
      setTasks(prev => prev.map(task => 
        task.id === id ? updatedTask : task
      ));
      
      toast({
        title: "Sucesso",
        description: "Tarefa atualizada com sucesso.",
      });
      
      return updatedTask;
    } catch (err) {
      console.error("Erro ao atualizar tarefa:", err);
      setError("Erro ao atualizar tarefa");
      
      toast({
        variant: "destructive",
        title: "Erro",
        description: `Não foi possível atualizar a tarefa. ${err instanceof Error ? err.message : ''}`,
      });
      
      throw err;
    }
  }, [toast]);

  const deleteTask = useCallback(async (id: number) => {
    try {
      const response = await fetch(`/api/tasks/${id}`, {
        method: 'DELETE'
      });
      
      if (!response.ok) {
        throw new Error(`Erro ao excluir tarefa: ${response.status}`);
      }
      
      // Atualizar estado local
      setTasks(prev => prev.filter(task => task.id !== id));
      
      toast({
        title: "Sucesso",
        description: "Tarefa excluída com sucesso.",
      });
      
      return true;
    } catch (err) {
      console.error("Erro ao excluir tarefa:", err);
      setError("Erro ao excluir tarefa");
      
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Não foi possível excluir a tarefa.",
      });
      
      return false;
    }
  }, [toast]);

  const addComment = useCallback(async (taskId: number, content: string) => {
    if (!user) {
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Você precisa estar logado para adicionar um comentário.",
      });
      return Promise.reject("Usuário não logado");
    }
    try {
      const response = await fetch(`/api/tasks/${taskId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content, userId: user.id })
      });

      if (!response.ok) {
        throw new Error(`Erro ao adicionar comentário: ${response.status}`);
      }

      const data = await response.json();
      const newComment = {
        ...data,
        createdAt: new Date(data.createdAt),
        updatedAt: new Date(data.updatedAt),
      };

      setTasks(prevTasks =>
        prevTasks.map(task =>
          task.id === taskId
            ? { ...task, comments: [...(task.comments || []), newComment] }
            : task
        )
      );

      toast({
        title: "Sucesso",
        description: "Comentário adicionado com sucesso.",
      });

      return newComment;
    } catch (err) {
      console.error("Erro ao adicionar comentário:", err);
      setError("Erro ao adicionar comentário");
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Não foi possível adicionar o comentário.",
      });
      throw err;
    }
  }, [toast, user]);
  
  const addTaskComment = useCallback(async (taskId: number, comment: Partial<TaskComment>) => {
    if (!user) {
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Você precisa estar logado para adicionar um comentário.",
      });
      return Promise.reject("Usuário não logado");
    }
    try {
      // Assume comment object includes userId if needed by backend or add it here
      const response = await fetch(`/api/tasks/${taskId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...comment, userId: user.id }) // Ensure userId is sent
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: `Erro ao adicionar comentário: ${response.status}` }));
        throw new Error(errorData.message || `Erro ao adicionar comentário: ${response.status}`);
      }

      const data = await response.json();
      const newComment = {
        ...data,
        createdAt: new Date(data.createdAt),
        updatedAt: new Date(data.updatedAt),
        // Ensure userName is populated if backend sends it, or fetch/construct it
        userName: data.userName || user?.username || 'Usuário Desconhecido' 
      };

      setTasks(prevTasks =>
        prevTasks.map(task =>
          task.id === taskId
            ? { ...task, comments: [...(task.comments || []), newComment] }
            : task
        )
      );

      toast({
        title: "Sucesso",
        description: "Comentário adicionado com sucesso.",
      });

      return newComment;
    } catch (err: any) {
      console.error("Erro ao adicionar comentário:", err);
      setError(err.message || "Erro ao adicionar comentário");
      toast({
        variant: "destructive",
        title: "Erro",
        description: err.message || "Não foi possível adicionar o comentário.",
      });
      throw err;
    }
  }, [toast, user]);

  const deleteTaskComment = useCallback(async (commentId: number) => {
    try {
      const response = await fetch(`/api/tasks/comments/${commentId}`, {
        method: 'DELETE'
      });
      
      if (!response.ok) {
        throw new Error(`Erro ao excluir comentário: ${response.status}`);
      }
      
      // Update the tasks state to remove the comment
      setTasks(prevTasks => 
        prevTasks.map(task => {
          if (!task.comments) return task;
          
          return {
            ...task,
            comments: task.comments.filter(comment => comment.id !== commentId)
          };
        })
      );
      
      toast({
        title: "Sucesso",
        description: "Comentário excluído com sucesso.",
      });
      
      return true;
    } catch (err) {
      console.error("Erro ao excluir comentário:", err);
      setError("Erro ao excluir comentário");
      
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Não foi possível excluir o comentário.",
      });
      
      return false;
    }
  }, [toast]);

  // Filtrar tarefas por usuário e status
  const currentUserId = user?.id || 0;
  const myTasks = tasks.filter(task => task.assignedToId === currentUserId && task.status !== "completed");
  const assignedTasks = tasks.filter(task => task.assignedById === currentUserId && task.status !== "completed");
  const completedTasks = tasks.filter(task => 
    (task.assignedToId === currentUserId || task.assignedById === currentUserId) && 
    task.status === "completed"
  );

  return (
    <TaskContext.Provider
      value={{
        tasks,
        loading,
        error,
        fetchTasks,
        fetchTaskById,
        createTask,
        updateTask,
        deleteTask,
        addComment,
        addTaskComment,
        deleteTaskComment,
        myTasks,
        assignedTasks,
        completedTasks,
      }}
    >
      {children}
    </TaskContext.Provider>
  );
};

export const useTaskContext = () => {
  const context = useContext(TaskContext);
  
  if (context === undefined) {
    throw new Error("useTaskContext deve ser usado dentro de um TaskProvider");
  }
  
  return context;
};