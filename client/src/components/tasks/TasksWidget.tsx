import { useTaskContext } from "@/context/TaskContext";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CheckCircle, Clock, AlertCircle, XCircle, PlusCircle } from "lucide-react";
import { Link } from "wouter";
import { format, isAfter, isBefore, startOfToday } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useState } from "react";

interface TasksWidgetProps {
  className?: string;
}

export default function TasksWidget({ className = "" }: TasksWidgetProps) {
  const { myTasks, loading } = useTaskContext();
  const [showAll, setShowAll] = useState(false);
  
  // Filtrar tarefas para mostrar apenas as pendentes e em andamento
  const activeTasks = myTasks.filter(task => 
    task.status === "pending" || task.status === "in_progress"
  );
  
  // Ordenar por prioridade e data de vencimento
  const sortedTasks = [...activeTasks].sort((a, b) => {
    // Primeiro por prioridade (high > medium > low)
    const priorityOrder = { high: 0, medium: 1, low: 2 };
    const priorityDiff = priorityOrder[a.priority] - priorityOrder[b.priority];
    
    if (priorityDiff !== 0) return priorityDiff;
    
    // Depois por data de vencimento (mais próxima primeiro)
    if (a.dueDate && b.dueDate) {
      return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
    }
    
    // Tarefas com data de vencimento vêm antes das sem data
    if (a.dueDate) return -1;
    if (b.dueDate) return 1;
    
    return 0;
  });
  
  // Limitar a quantidade de tarefas exibidas se não estiver mostrando todas
  const displayedTasks = showAll ? sortedTasks : sortedTasks.slice(0, 3);
  
  const getStatusIcon = (status: string) => {
    switch (status) {
      case "pending":
        return <AlertCircle className="h-4 w-4 text-blue-500 flex-shrink-0" />;
      case "in_progress":
        return <Clock className="h-4 w-4 text-purple-500 flex-shrink-0" />;
      case "completed":
        return <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0" />;
      case "cancelled":
        return <XCircle className="h-4 w-4 text-red-500 flex-shrink-0" />;
      default:
        return <AlertCircle className="h-4 w-4 flex-shrink-0" />;
    }
  };
  
  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case "high":
        return <Badge variant="outline" className="bg-red-50 text-red-600 border-red-200 text-xs">Alta</Badge>;
      case "medium":
        return <Badge variant="outline" className="bg-amber-50 text-amber-600 border-amber-200 text-xs">Média</Badge>;
      case "low":
        return <Badge variant="outline" className="bg-green-50 text-green-600 border-green-200 text-xs">Baixa</Badge>;
      default:
        return <Badge variant="outline" className="text-xs">{priority}</Badge>;
    }
  };
  
  const getDueDateStatus = (dueDate?: Date) => {
    if (!dueDate) return null;
    
    const today = startOfToday();
    const dueDateTime = new Date(dueDate);
    
    if (isBefore(dueDateTime, today)) {
      return <span className="text-xs text-red-500">Atrasada</span>;
    }
    
    return (
      <span className="text-xs text-gray-500">
        {format(dueDateTime, "dd/MM", { locale: ptBR })}
      </span>
    );
  };
  
  return (
    <Card variant="glowIntenseLifted" className={`flex flex-col h-full p-3 sm:p-5 ${className}`}>
      <div className="flex justify-between items-center mb-3 sm:mb-4 border-b dark:border-primary/20 pb-3">
        <div className="flex items-center gap-2">
          <Clock className="h-5 w-5 text-[#ff9810]" />
          <h3 className="font-heading text-base sm:text-lg font-medium dark:text-white dark:glow-title">Minhas Tarefas</h3>
        </div>
        <Link href="/tarefas">
          <Button variant="ghost" size="icon" className="h-8 w-8 text-gray-400 hover:text-secondary transition-all duration-200 dark:text-gray-300 dark:hover:text-pink-400 hover:scale-110 dark:hover:glow-text">
            <span className="material-icons text-base sm:text-lg">list_alt</span>
          </Button>
        </Link>
      </div>
      
      <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-200 dark:scrollbar-thumb-slate-700 scrollbar-track-transparent">
        {loading ? (
          <div className="flex justify-center items-center h-full">
            <p className="text-gray-500 dark:text-gray-400">Carregando tarefas...</p>
          </div>
        ) : displayedTasks.length > 0 ? (
          <div className="space-y-2">
            {displayedTasks.map((task) => (
              <Link key={task.id} href={`/tarefas/${task.id}`}>
                <div className="bg-white dark:bg-slate-800/50 border border-gray-100 dark:border-gray-700/50 rounded-lg p-3 hover:shadow-md transition-all duration-200 hover-lift-sm cursor-pointer">
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex items-start gap-2">
                      {getStatusIcon(task.status)}
                      <span className="font-medium text-sm text-gray-800 dark:text-white line-clamp-1">
                        {task.title}
                      </span>
                    </div>
                    <div className="flex gap-1.5 items-center">
                      {getPriorityBadge(task.priority)}
                      {task.dueDate && getDueDateStatus(task.dueDate)}
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="h-full flex flex-col justify-center items-center py-6 text-muted-foreground">
            <div className="p-4 rounded-full bg-gray-50 dark:bg-gray-700/30 mb-3">
              <CheckCircle className="h-6 w-6 text-gray-400 dark:text-gray-500" />
            </div>
            <p className="text-center text-sm text-gray-500 dark:text-gray-400 mb-2">
              Você não possui tarefas pendentes
            </p>
            <Link href="/tarefas">
              <Button variant="outline" size="sm" className="mt-2 flex items-center gap-1.5">
                <PlusCircle className="h-3.5 w-3.5" />
                Nova Tarefa
              </Button>
            </Link>
          </div>
        )}
      </div>
      
      {sortedTasks.length > 3 && !showAll && (
        <div className="mt-3 pt-2 border-t dark:border-gray-700/50">
          <Button 
            variant="ghost" 
            size="sm" 
            className="w-full text-xs text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            onClick={() => setShowAll(true)}
          >
            Ver todas as {sortedTasks.length} tarefas
          </Button>
        </div>
      )}
      
      {showAll && sortedTasks.length > 3 && (
        <div className="mt-3 pt-2 border-t dark:border-gray-700/50">
          <Button 
            variant="ghost" 
            size="sm" 
            className="w-full text-xs text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            onClick={() => setShowAll(false)}
          >
            Mostrar menos
          </Button>
        </div>
      )}
    </Card>
  );
} 