import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Clock, Calendar, User, MessageSquare, CheckCircle, AlertCircle, XCircle, Paperclip, Bell } from "lucide-react";
import { useState } from "react";
import TaskDetailDialog from "./TaskDetailDialog";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

interface TaskCardProps {
  id: number;
  title: string;
  description?: string;
  assignedToName: string;
  assignedByName: string;
  dueDate?: Date;
  priority: "low" | "medium" | "high";
  status: "pending" | "in_progress" | "completed" | "cancelled";
  relatedLeadName?: string;
  commentCount: number;
  hasAttachments?: boolean;
  onStatusChange?: (taskId: number, newStatus: string) => void;
  onOpenDetails?: (taskId: number) => void;
}

export default function TaskCard({
  id,
  title,
  description,
  assignedToName,
  assignedByName,
  dueDate,
  priority,
  status,
  relatedLeadName,
  commentCount,
  hasAttachments = false,
  onStatusChange,
  onOpenDetails
}: TaskCardProps) {
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

  const getStatusActions = () => {
    const statusActions = [];
    
    // Ações de status (apenas se onStatusChange for fornecido)
    if (onStatusChange) {
      switch (status) {
        case "pending":
          statusActions.push(
            <Button 
              key="start"
              variant="outline" 
              size="sm" 
              className="text-purple-600 border-purple-200 hover:bg-purple-50"
              onClick={(e) => {
                e.stopPropagation();
                onStatusChange(id, "in_progress");
              }}
            >
              Iniciar
            </Button>,
            <Button 
              key="cancel"
              variant="outline" 
              size="sm" 
              className="text-red-600 border-red-200 hover:bg-red-50"
              onClick={(e) => {
                e.stopPropagation();
                onStatusChange(id, "cancelled");
              }}
            >
              Cancelar
            </Button>
          );
          break;
        case "in_progress":
          statusActions.push(
            <Button 
              key="complete"
              variant="outline" 
              size="sm" 
              className="text-green-600 border-green-200 hover:bg-green-50"
              onClick={(e) => {
                e.stopPropagation();
                onStatusChange(id, "completed");
              }}
            >
              Concluir
            </Button>,
            <Button 
              key="pause"
              variant="outline" 
              size="sm" 
              className="text-blue-600 border-blue-200 hover:bg-blue-50"
              onClick={(e) => {
                e.stopPropagation();
                onStatusChange(id, "pending");
              }}
            >
              Pausar
            </Button>
          );
          break;
      }
    }



    return statusActions.length > 0 ? statusActions : null;
  };

  const getStatusIcon = () => {
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

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "high":
        return "border-l-4 border-red-500";
      case "medium":
        return "border-l-4 border-amber-400";
      case "low":
        return "border-l-4 border-green-500";
      default:
        return "border-l-4 border-gray-300";
    }
  };

  // Gerador de cor para avatar baseado no nome do usuário
  const getAvatarColor = (name: string): string => {
    if (!name) return "#64748b";
    
    const colors = [
      "#3b82f6", // blue
      "#ef4444", // red
      "#10b981", // green
      "#f59e0b", // amber
      "#8b5cf6", // violet
      "#ec4899", // pink
      "#14b8a6", // teal
      "#f43f5e", // rose
      "#6366f1", // indigo
      "#84cc16", // lime
    ];
    
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
      hash = hash & hash;
    }
    
    return colors[Math.abs(hash) % colors.length];
  };

  return (
    <Card
      className={`relative p-2.5 transition-all duration-200 rounded-md shadow-sm border border-white/30 dark:border-slate-700/40 bg-white/70 dark:bg-slate-800/70 backdrop-blur-md min-h-[75px] ${getPriorityColor(priority)} ${status === "completed" ? "opacity-75" : ""} hover:shadow-md hover:bg-white/80 dark:hover:bg-slate-800/80 cursor-pointer`}
      onClick={() => onOpenDetails && onOpenDetails(id)}
    >
      {/* Notification indicator */}
      {(commentCount > 0 || hasAttachments) && (
        <div className="absolute -top-1 -right-1 bg-blue-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs shadow-sm z-10" title={
          commentCount > 0 && hasAttachments 
            ? "Possui comentários e anexos"
            : commentCount > 0 
            ? `${commentCount} comentário${commentCount > 1 ? 's' : ''}`
            : "Possui anexos"
        }>
          {commentCount > 0 && hasAttachments ? (
            "+"
          ) : commentCount > 0 ? (
            <MessageSquare className="h-3 w-3" />
          ) : (
            <Paperclip className="h-3 w-3" />
          )}
        </div>
      )}
      
      {/* Badge/tag no topo */}
      <div className="flex items-center justify-between mb-1">
        <div className="flex gap-1">
          {getPriorityBadge(priority)}
          {getStatusBadge(status)}
        </div>
      </div>
      {/* Título */}
      <h3 className="font-medium text-gray-900 dark:text-white text-sm mb-0.5">{title}</h3>
      {/* Descrição */}
      {description && (
        <p className="text-xs text-gray-500 dark:text-gray-400 mb-0.5 line-clamp-1">{description}</p>
      )}
      {/* Avatar e metadados */}
      <div className="flex items-center justify-between mt-1.5">
        <div className="flex gap-2 text-xs text-gray-400 dark:text-gray-500 items-center">
          {dueDate && (
            <span className="flex items-center gap-0.5">
              <Calendar className="h-3 w-3" />
              {format(new Date(dueDate), "dd/MM", { locale: ptBR })}
            </span>
          )}
          <span className="flex items-center gap-0.5" title={commentCount > 0 ? `${commentCount} comentário${commentCount !== 1 ? 's' : ''}` : "Sem comentários"}>
            <MessageSquare className="h-3 w-3" />
            {commentCount > 0 && (
              <span className="text-xs">{commentCount}</span>
            )}
          </span>
          <span className="flex items-center gap-0.5" title={hasAttachments ? "Possui anexos" : "Sem anexos"}>
            <Paperclip className="h-3 w-3" />
            {hasAttachments && (
              <span className="block h-1.5 w-1.5 rounded-full bg-blue-500"></span>
            )}
          </span>
        </div>
        <Avatar className="h-6 w-6" title={`Responsável: ${assignedToName}`}>
          <AvatarFallback 
            style={{ 
              background: getAvatarColor(assignedToName), 
              color: 'white', 
              fontSize: 11,
              fontWeight: 'bold' 
            }}
          >
            {assignedToName ? assignedToName.substring(0, 2).toUpperCase() : "?"}
          </AvatarFallback>
        </Avatar>
      </div>
      
      {/* Ações só aparecem em hover */}
      {getStatusActions() && (
        <div className="absolute top-0 left-0 right-0 bottom-0 bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm opacity-0 hover:opacity-100 flex items-center justify-center gap-1 transition-opacity duration-200 rounded-md">
          {getStatusActions()}
        </div>
      )}
    </Card>
  );
} 