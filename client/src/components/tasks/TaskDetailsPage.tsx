import { useState, useEffect } from "react";
import { useRoute } from "wouter";
import { useTaskContext } from "@/context/TaskContext";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { format, formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ArrowLeft, Calendar, Clock, User, MessageSquare, CheckCircle, AlertCircle, XCircle, Send } from "lucide-react";
import { Link } from "wouter";
import TaskDialog from "./TaskDialog";

export default function TaskDetailsPage() {
  const [, params] = useRoute("/tarefas/:id");
  const taskId = params ? parseInt(params.id) : null;
  
  const { fetchTaskById, updateTask, addComment } = useTaskContext();
  const [task, setTask] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [comment, setComment] = useState("");
  const [submittingComment, setSubmittingComment] = useState(false);

  useEffect(() => {
    if (taskId) {
      setLoading(true);
      fetchTaskById(taskId)
        .then((fetchedTask) => {
          if (fetchedTask) {
            setTask(fetchedTask);
          } else {
            setError("Tarefa não encontrada");
          }
        })
        .catch((err) => {
          setError("Erro ao carregar detalhes da tarefa");
          console.error(err);
        })
        .finally(() => {
          setLoading(false);
        });
    }
  }, [taskId, fetchTaskById]);

  const handleStatusChange = async (newStatus: string) => {
    if (!task) return;
    
    try {
      const updatedTask = await updateTask(task.id, { 
        status: newStatus as "pending" | "in_progress" | "completed" | "cancelled" 
      });
      setTask(updatedTask);
    } catch (err) {
      console.error("Erro ao atualizar status:", err);
    }
  };

  const handleCommentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!comment.trim() || !task) return;
    
    setSubmittingComment(true);
    try {
      const newComment = await addComment(task.id, comment);
      setComment("");
      
      // Atualizar a tarefa com o novo comentário
      setTask({
        ...task,
        comments: [...(task.comments || []), newComment]
      });
    } catch (err) {
      console.error("Erro ao adicionar comentário:", err);
    } finally {
      setSubmittingComment(false);
    }
  };

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case "high":
        return <Badge variant="outline" className="bg-red-50 text-red-600 border-red-200">Alta</Badge>;
      case "medium":
        return <Badge variant="outline" className="bg-amber-50 text-amber-600 border-amber-200">Média</Badge>;
      case "low":
        return <Badge variant="outline" className="bg-green-50 text-green-600 border-green-200">Baixa</Badge>;
      default:
        return <Badge variant="outline">{priority}</Badge>;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return <Badge variant="outline" className="bg-blue-50 text-blue-600 border-blue-200">Pendente</Badge>;
      case "in_progress":
        return <Badge variant="outline" className="bg-purple-50 text-purple-600 border-purple-200">Em andamento</Badge>;
      case "completed":
        return <Badge variant="outline" className="bg-green-50 text-green-600 border-green-200">Concluída</Badge>;
      case "cancelled":
        return <Badge variant="outline" className="bg-red-50 text-red-600 border-red-200">Cancelada</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "pending":
        return <AlertCircle className="h-5 w-5 text-blue-500" />;
      case "in_progress":
        return <Clock className="h-5 w-5 text-purple-500" />;
      case "completed":
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case "cancelled":
        return <XCircle className="h-5 w-5 text-red-500" />;
      default:
        return <AlertCircle className="h-5 w-5" />;
    }
  };

  const getStatusActions = () => {
    if (!task) return null;

    switch (task.status) {
      case "pending":
        return (
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              size="sm" 
              className="text-purple-600 border-purple-200 hover:bg-purple-50"
              onClick={() => handleStatusChange("in_progress")}
            >
              Iniciar
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              className="text-red-600 border-red-200 hover:bg-red-50"
              onClick={() => handleStatusChange("cancelled")}
            >
              Cancelar
            </Button>
          </div>
        );
      case "in_progress":
        return (
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              size="sm" 
              className="text-green-600 border-green-200 hover:bg-green-50"
              onClick={() => handleStatusChange("completed")}
            >
              Concluir
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              className="text-blue-600 border-blue-200 hover:bg-blue-50"
              onClick={() => handleStatusChange("pending")}
            >
              Pausar
            </Button>
          </div>
        );
      case "completed":
      case "cancelled":
        return (
          <Button 
            variant="outline" 
            size="sm" 
            className="text-blue-600 border-blue-200 hover:bg-blue-50"
            onClick={() => handleStatusChange("pending")}
          >
            Reabrir
          </Button>
        );
      default:
        return null;
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto p-4 md:p-6">
        <div className="flex justify-center items-center h-64">
          <p>Carregando detalhes da tarefa...</p>
        </div>
      </div>
    );
  }

  if (error || !task) {
    return (
      <div className="container mx-auto p-4 md:p-6">
        <div className="flex flex-col justify-center items-center h-64">
          <p className="text-red-500 mb-4">{error || "Tarefa não encontrada"}</p>
          <Link href="/tarefas">
            <Button variant="outline">Voltar para tarefas</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 md:p-6">
      <div className="mb-6">
        <Link href="/tarefas">
          <Button variant="ghost" className="flex items-center gap-2 mb-4">
            <ArrowLeft className="h-4 w-4" />
            Voltar para tarefas
          </Button>
        </Link>
        
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="flex items-center gap-3">
            {getStatusIcon(task.status)}
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{task.title}</h1>
          </div>
          
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setShowEditDialog(true)}>
              Editar
            </Button>
            {getStatusActions()}
          </div>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2">
          <Card className="p-6">
            <div className="flex justify-between mb-4">
              <div className="flex gap-2">
                {getPriorityBadge(task.priority)}
                {getStatusBadge(task.status)}
              </div>
              
              {task.dueDate && (
                <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
                  <Calendar className="h-4 w-4" />
                  <span>Prazo: {format(new Date(task.dueDate), "dd/MM/yyyy", { locale: ptBR })}</span>
                </div>
              )}
            </div>
            
            {task.description ? (
              <p className="text-gray-700 dark:text-gray-200 mb-6">{task.description}</p>
            ) : (
              <p className="text-gray-500 dark:text-gray-400 italic mb-6">Sem descrição</p>
            )}
            
            <Separator className="my-4" />
            
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <MessageSquare className="h-5 w-5 text-gray-500" />
              Comentários
            </h2>
            
            <div className="space-y-4 mb-6">
              {task.comments && task.comments.length > 0 ? (
                task.comments.map((comment: any) => (
                  <div key={comment.id} className="flex gap-3">
                    <Avatar className="h-8 w-8">
                      <AvatarFallback>
                        {comment.userName?.charAt(0) || "U"}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <div className="flex justify-between items-center mb-1">
                        <span className="font-medium text-sm">{comment.userName}</span>
                        <span className="text-xs text-gray-500">
                          {formatDistanceToNow(new Date(comment.createdAt), { 
                            addSuffix: true, 
                            locale: ptBR 
                          })}
                        </span>
                      </div>
                      <p className="text-sm text-gray-700 dark:text-gray-300">{comment.content}</p>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-gray-500 dark:text-gray-400 text-sm italic">
                  Nenhum comentário ainda
                </p>
              )}
            </div>
            
            <form onSubmit={handleCommentSubmit} className="flex flex-col gap-3">
              <Textarea 
                placeholder="Adicione um comentário..."
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                disabled={submittingComment}
                className="min-h-[80px]"
              />
              <div className="flex justify-end">
                <Button 
                  type="submit" 
                  disabled={!comment.trim() || submittingComment}
                  className="flex items-center gap-2"
                >
                  <Send className="h-4 w-4" />
                  {submittingComment ? "Enviando..." : "Enviar"}
                </Button>
              </div>
            </form>
          </Card>
        </div>
        
        <div>
          <Card className="p-6">
            <h2 className="font-semibold mb-4">Detalhes</h2>
            
            <div className="space-y-4">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Atribuído a</p>
                <div className="flex items-center gap-2 mt-1">
                  <Avatar className="h-6 w-6">
                    <AvatarFallback>{task.assignedToName?.charAt(0) || "U"}</AvatarFallback>
                  </Avatar>
                  <span>{task.assignedToName}</span>
                </div>
              </div>
              
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Criado por</p>
                <div className="flex items-center gap-2 mt-1">
                  <Avatar className="h-6 w-6">
                    <AvatarFallback>{task.assignedByName?.charAt(0) || "U"}</AvatarFallback>
                  </Avatar>
                  <span>{task.assignedByName}</span>
                </div>
              </div>
              
              {task.relatedLeadName && (
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Lead relacionado</p>
                  <div className="flex items-center gap-2 mt-1">
                    <User className="h-4 w-4 text-gray-400" />
                    <span>{task.relatedLeadName}</span>
                  </div>
                </div>
              )}
              
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Data de criação</p>
                <p className="mt-1">{format(new Date(task.createdAt), "dd/MM/yyyy", { locale: ptBR })}</p>
              </div>
              
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Última atualização</p>
                <p className="mt-1">{format(new Date(task.updatedAt), "dd/MM/yyyy", { locale: ptBR })}</p>
              </div>
            </div>
          </Card>
        </div>
      </div>
      
      {showEditDialog && (
        <TaskDialog 
          open={showEditDialog} 
          onOpenChange={setShowEditDialog} 
          taskId={task.id} 
        />
      )}
    </div>
  );
} 