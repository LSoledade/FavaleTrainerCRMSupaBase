import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogClose, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { X, Paperclip, Calendar, MessageSquare, Plus, Edit, Check, Trash2 } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { useTaskContext } from "@/context/TaskContext";
import TaskDialog from "./TaskDialog";
import { useAuth } from "@/hooks/use-auth";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useToast } from "@/components/ui/use-toast";

interface TaskDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  taskId?: number;
}

export default function TaskDetailDialog({ open, onOpenChange, taskId }: TaskDetailDialogProps) {
  const { fetchTaskById, updateTask, addTaskComment, deleteTaskComment, deleteTask } = useTaskContext();
  const { toast } = useToast();
  const { user } = useAuth();

  const [task, setTask] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [comment, setComment] = useState("");
  const [attachments, setAttachments] = useState<File[]>([]);
  const [commentsList, setCommentsList] = useState<any[]>([]);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [users, setUsers] = useState<Array<{id: number, username: string, role: string}>>([]);
  const [assigningUser, setAssigningUser] = useState(false);
  const [deletingComment, setDeletingComment] = useState<number | null>(null);

  // Gerar cor consistente com base em uma string (para avatares)
  function stringToColor(str: string) {
    let hash = 0;
    if (!str) return '#70a0ea';
    for (let i = 0; i < str.length; i++) {
      hash = str.charCodeAt(i) + ((hash << 5) - hash);
      hash = hash & hash;
    }

    const colors = [
      '#3b82f6', // blue
      '#ef4444', // red
      '#10b981', // green
      '#f59e0b', // amber
      '#8b5cf6', // violet
      '#ec4899', // pink
      '#14b8a6', // teal
      '#f43f5e', // rose
      '#6366f1', // indigo
      '#84cc16', // lime
      '#06b6d4', // cyan
      '#22c55e', // emerald
    ];

    return colors[Math.abs(hash) % colors.length];
  }

  // Carregar detalhes da tarefa
  useEffect(() => {
    if (taskId) {
      setIsLoading(true);
      fetchTaskById(taskId).then((data) => {
        if (data) {
          setTask(data);
          // Se a tarefa tiver comentários, populamos a lista
          if (data.comments && Array.isArray(data.comments)) {
            setCommentsList(data.comments);
          }
        }
        setIsLoading(false);
      });
    }
  }, [taskId, fetchTaskById]);

  // Carregar lista de usuários do sistema
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const response = await fetch('/api/users');
        if (response.ok) {
          const data = await response.json();
          setUsers(data);
        } else {
          console.error('Erro ao buscar usuários:', response.statusText);
        }
      } catch (error) {
        console.error('Erro ao buscar usuários:', error);
      }
    };

    fetchUsers();
  }, []);

  const handleAddComment = async () => {
    if (!comment.trim() || !taskId || !user) return;

    try {
      // Prepare comment data (without ID - server will assign one)
      const commentData = {
        taskId,
        userId: user.id, // Use actual user ID
        content: comment,
      };

      // Send to server and get response with actual ID
      const newComment = await addTaskComment(taskId, commentData);

      // Only update local state after successful server response
      setCommentsList(prev => [...prev, newComment]);
      setComment("");

    } catch (error) {
      console.error("Erro ao adicionar comentário:", error);
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Não foi possível adicionar o comentário.",
      });
    }
  };

  const handleAddAttachment = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.onchange = (e) => {
      const files = (e.target as HTMLInputElement).files;
      if (files && files.length > 0) {
        setAttachments(prev => [...prev, files[0]]);
      }
    };
    input.click();
  };

  // Atribuir tarefa a outro usuário
  const handleAssignUser = async (userId: number) => {
    if (!taskId) return;

    setAssigningUser(true);
    try {
      await updateTask(taskId, { assignedToId: userId });

      // Atualizar o estado local da tarefa
      const updatedTask = { 
        ...task, 
        assignedToId: userId,
        assignedToName: users.find(u => u.id === userId)?.username || task.assignedToName
      };
      setTask(updatedTask);

      toast({
        title: "Tarefa atribuída",
        description: "O responsável pela tarefa foi alterado com sucesso.",
      });
    } catch (error) {
      console.error("Erro ao atribuir tarefa:", error);
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Não foi possível atribuir a tarefa ao usuário selecionado.",
      });
    } finally {
      setAssigningUser(false);
    }
  };

  const handleDeleteComment = async (commentId: number) => {
    if (!taskId || !commentId) return;

    setDeletingComment(commentId);
    try {
      const success = await deleteTaskComment(commentId);

      if (success) {
        // Update local comments list
        setCommentsList(prev => prev.filter(comment => comment.id !== commentId));

        toast({
          title: "Comentário excluído",
          description: "O comentário foi excluído com sucesso.",
        });
      } else {
        throw new Error("Falha ao excluir comentário");
      }
    } catch (error) {
      console.error("Erro ao excluir comentário:", error);
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Não foi possível excluir o comentário.",
      });
    } finally {
      setDeletingComment(null);
    }
  };

  const handleDeleteTask = async () => {
    if (!task) return;
    
    if (window.confirm(`Tem certeza que deseja excluir a tarefa "${task.title}"? Esta ação não pode ser desfeita.`)) {
      const success = await deleteTask(task.id);
      if (success) {
        onOpenChange(false); // Fechar o modal após exclusão
      }
    }
  };

  if (isLoading || !task) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent 
          className="sm:max-w-[550px]" 
          aria-describedby="task-details-loading"
        >
          <DialogHeader>
            <DialogTitle>Detalhes da Tarefa</DialogTitle>
            <p id="task-details-loading" className="sr-only">Carregando informações da tarefa selecionada.</p>
          </DialogHeader>
          <div className="flex items-center justify-center h-48">
            <p className="text-gray-500">Carregando detalhes...</p>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent 
        className="sm:max-w-[550px] p-0 overflow-hidden max-h-[90vh] overflow-y-auto" 
        aria-describedby="task-details-description"
      >
        <DialogHeader className="p-4 border-b sticky top-0 bg-white dark:bg-gray-900 z-10">
          <div className="flex items-center justify-between">
            <DialogTitle>{task.title}</DialogTitle>
            <div className="flex items-center gap-2">
              <Button 
                variant="outline" 
                size="sm" 
                className="h-8 flex items-center gap-1"
                onClick={() => setShowEditDialog(true)}
              >
                <Edit className="h-3.5 w-3.5" />
                Editar
              </Button>
              {user?.role === "admin" && (
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="h-8 flex items-center gap-1 text-red-600 border-red-200 hover:bg-red-50"
                  onClick={handleDeleteTask}
                  title="Excluir tarefa"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Excluir
                </Button>
              )}
              <DialogClose asChild>
                <Button variant="ghost" size="icon" className="rounded-full h-8 w-8">
                  <X className="h-4 w-4" />
                </Button>
              </DialogClose>
            </div>
          </div>
          <p id="task-details-description" className="sr-only">Este diálogo mostra informações detalhadas sobre a tarefa selecionada.</p>
        </DialogHeader>

        <div className="p-6 space-y-6">
          {/* Seção de atribuição e meta-info */}
          <div className="flex flex-wrap gap-4 items-center">
            <div className="flex items-center gap-2">
              <Label className="text-sm text-gray-500">Atribuído:</Label>
              <div className="flex items-center">
                <Avatar className="h-7 w-7 border-2 border-white dark:border-gray-900">
                  <AvatarFallback
                    style={{
                      background: stringToColor(task.assignedToName || 'User'),
                      color: 'white'
                    }}
                  >
                    {task.assignedToName?.substring(0, 2).toUpperCase() || 'UN'}
                  </AvatarFallback>
                </Avatar>
                <span className="ml-2 text-sm font-medium">{task.assignedToName || "Não atribuído"}</span>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm" className="ml-1 h-7 w-7 p-0">
                      <Plus className="h-3.5 w-3.5" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56">
                    {users.map(user => (
                      <DropdownMenuItem 
                        key={user.id}
                        onClick={() => handleAssignUser(user.id)}
                        disabled={assigningUser}
                        className="cursor-pointer"
                      >
                        <div className="flex items-center gap-2 w-full">
                          <Avatar className="h-6 w-6">
                            <AvatarFallback 
                              style={{
                                background: stringToColor(user.username),
                                color: 'white',
                                fontSize: '12px'
                              }}
                            >
                              {user.username.substring(0, 2).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <span className="flex-1 truncate">{user.username}</span>
                          {task.assignedToId === user.id && (
                            <Check className="h-4 w-4 text-green-500" />
                          )}
                        </div>
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Label className="text-sm text-gray-500">Nível:</Label>
              <Badge 
                className={`capitalize ${
                  task.priority === 'high' 
                    ? 'bg-red-100 text-red-800 hover:bg-red-100' 
                    : task.priority === 'medium'
                    ? 'bg-amber-100 text-amber-800 hover:bg-amber-100'
                    : 'bg-green-100 text-green-800 hover:bg-green-100'
                }`}
              >
                {task.priority === 'high' 
                  ? 'Alto' 
                  : task.priority === 'medium' 
                  ? 'Médio' 
                  : 'Baixo'}
              </Badge>
            </div>

            <div className="flex items-center gap-2">
              <Label className="text-sm text-gray-500">Data:</Label>
              <div className="flex items-center gap-1">
                <Calendar className="h-4 w-4 text-gray-400" />
                <span className="text-sm">
                  {task.dueDate && format(new Date(task.dueDate), "dd 'de' MMM, yyyy", { locale: ptBR })}
                </span>
              </div>
            </div>
          </div>

          {/* Descrição */}
          <div>
            <Label className="text-sm font-medium">Descrição:</Label>
            <p className="mt-2 text-sm text-gray-700 dark:text-gray-300 whitespace-pre-line">
              {task.description || "Sem descrição."}
            </p>
          </div>

          {/* Anexos */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <Label className="text-sm font-medium flex items-center">
                <Paperclip className="h-4 w-4 mr-2" />
                Anexos:
              </Label>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 text-blue-600 hover:text-blue-800 hover:bg-blue-50"
                onClick={handleAddAttachment}
              >
                + Adicionar um Anexo
              </Button>
            </div>

            {attachments.length > 0 ? (
              <div className="space-y-2">
                {attachments.map((file, index) => (
                  <div key={index} className="flex items-center p-2 border rounded-md bg-gray-50 dark:bg-gray-800">
                    <div className="bg-gray-200 dark:bg-gray-700 rounded p-1 mr-3">
                      <Paperclip className="h-4 w-4" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium">{file.name}</p>
                      <p className="text-xs text-gray-500">{Math.round(file.size / 1024)} KB</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-sm text-gray-500 italic">
                Nenhum anexo adicionado.
              </div>
            )}
          </div>

          <Separator />

          {/* Comentários */}
          <div>
            <Label className="text-sm font-medium flex items-center">
              <MessageSquare className="h-4 w-4 mr-2" />
              Comentários:
            </Label>

            <div className="mt-4 space-y-4">
              {commentsList.length > 0 ? (
                commentsList.map((comment, index) => (
                  <div key={index} className="flex gap-3">
                    <Avatar className="h-8 w-8">
                      <AvatarFallback
                        style={{
                          background: stringToColor(comment.userName || 'User'),
                          color: 'white'
                        }}
                      >
                        {comment.userName?.substring(0, 2).toUpperCase() || 'UN'}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium">{comment.userName}</p>
                          <span className="text-xs text-gray-500">
                            {format(new Date(comment.createdAt), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                          </span>
                        </div>
                        {user && (user.id === comment.userId || user.role === 'admin') && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 text-gray-400 hover:text-red-500"
                            onClick={() => handleDeleteComment(comment.id)}
                            disabled={deletingComment === comment.id}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                      <p className="text-sm mt-1">{comment.content}</p>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-sm text-gray-500">Nenhum comentário ainda.</p>
              )}
            </div>

            {/* Formulário de novo comentário */}
            <div className="mt-4 flex items-center gap-3">
              <Avatar className="h-8 w-8">
                <AvatarFallback
                  style={{
                    background: stringToColor(user?.username || 'User'),
                    color: 'white'
                  }}
                >
                  {user?.username ? user.username.substring(0, 2).toUpperCase() : 'U'}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 flex gap-2">
                <Input
                  className="flex-1"
                  placeholder="O que você quer dizer..."
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleAddComment();
                    }
                  }}
                />
                <Button 
                  variant="ghost" 
                  size="icon"
                  className="text-blue-600 hover:text-blue-800 hover:bg-blue-50"
                  onClick={handleAddComment}
                >
                  <MessageSquare className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>

      {/* Dialog para editar a tarefa */}
      {showEditDialog && taskId && (
        <TaskDialog 
          open={showEditDialog} 
          onOpenChange={setShowEditDialog} 
          taskId={taskId} 
        />
      )}
    </Dialog>
  );
}