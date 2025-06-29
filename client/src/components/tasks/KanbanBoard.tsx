import React, { useState, useEffect } from "react";
import { DragDropContext, Droppable, Draggable } from "react-beautiful-dnd";
import TaskCard from "./TaskCard";
import { useTaskContext } from "@/context/TaskContext";
import { Button } from "@/components/ui/button";
import { PlusCircle, ListTodo, ClipboardList, Loader2, CheckCircle } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";


const columns = [
  { id: "backlog", name: "Backlog Tasks", color: "bg-orange-100 text-orange-700 dark:bg-orange-800 dark:text-orange-200", icon: <ClipboardList className="h-4 w-4" /> },
  { id: "pending", name: "To Do Tasks", color: "bg-pink-100 text-pink-700 dark:bg-pink-800 dark:text-pink-200", icon: <ListTodo className="h-4 w-4" /> },
  { id: "in_process", name: "In Process", color: "bg-purple-100 text-purple-700 dark:bg-purple-800 dark:text-purple-200", icon: <Loader2 className="h-4 w-4 animate-spin-slow" /> },
  { id: "done", name: "Done", color: "bg-green-100 text-green-700 dark:bg-green-800 dark:text-green-200", icon: <CheckCircle className="h-4 w-4" /> },
];

export default function KanbanBoard({ onCreateTask, onOpenDetails }: { onCreateTask: (initialStatus?: string) => void, onOpenDetails?: (taskId: number) => void }) {
  const { tasks, updateTask } = useTaskContext();
  const [localTasks, setLocalTasks] = useState<any[]>([]);
  const { toast } = useToast();

  // Sincroniza localTasks com tasks do contexto
  useEffect(() => {
    setLocalTasks(tasks);
  }, [tasks]);

  // Agrupa tarefas por status
  const tasksByStatus = columns.reduce((acc, col) => {
    acc[col.id] = localTasks.filter(task => (
      task.status === col.id || 
      (col.id === "in_process" && task.status === "in_progress") || 
      (col.id === "done" && task.status === "completed")
    ));
    return acc;
  }, {} as Record<string, any[]>);

  const onDragEnd = async (result: any) => {
    if (!result.destination) return;
    const { draggableId, destination, source } = result;

    // Prevent re-rendering if dropped in the same place
    if (destination.droppableId === source.droppableId && destination.index === source.index) return;

    // Mapeamento correto para o backend
    let backendStatus = destination.droppableId;
    if (backendStatus === "in_process") backendStatus = "in_progress";
    else if (backendStatus === "done") backendStatus = "completed";
    // Não modificar o status backlog e pending - manter como estão

    // Validar o status para garantir que seja um dos tipos permitidos
    if (!["backlog", "pending", "in_progress", "completed", "cancelled"].includes(backendStatus)) {
      console.error(`Status inválido: ${backendStatus}`);
      toast({
        variant: "destructive",
        title: "Erro ao atualizar tarefa",
        description: "Status inválido detectado."
      });
      return;
    }

    // Optimistic update: atualiza localTasks imediatamente
    setLocalTasks(prev => prev.map(task =>
      String(task.id) === draggableId
        ? { ...task, status: backendStatus }
        : task
    ));

    // Atualiza no backend/contexto
    try {
      await updateTask(Number(draggableId), { 
        status: backendStatus as "backlog" | "pending" | "in_progress" | "completed" | "cancelled"
      });
    } catch (error) {
      console.error("Erro ao atualizar status da tarefa:", error);
      
      // Revert the optimistic update if the server update failed
      setLocalTasks(prev => prev.map(task =>
        String(task.id) === draggableId
          ? { ...task, status: source.droppableId === "in_process" ? "in_progress" : source.droppableId === "done" ? "completed" : source.droppableId }
          : task
      ));
      
      toast({
        variant: "destructive",
        title: "Erro ao atualizar tarefa",
        description: "Não foi possível mover a tarefa para a nova coluna."
      });
    }
  };

  return (
    <DragDropContext onDragEnd={onDragEnd}>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3 min-h-[500px]">
        {columns.map(col => (
          <Droppable droppableId={col.id} key={col.id}>
            {(provided: any) => (
              <div
                ref={provided.innerRef}
                {...provided.droppableProps}
                className={`flex flex-col ${col.color} rounded-2xl min-h-[500px] max-h-[calc(100vh-200px)] overflow-hidden`}
              >
                {/* Header da coluna */}
                <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 dark:border-slate-700 sticky top-0 z-10 bg-slate-50 dark:bg-slate-900">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-sm text-slate-700 dark:text-slate-200">{col.name}</span>
                    <span className={`ml-1 text-xs py-0.5 px-1.5 rounded-md font-bold ${col.color} ${col.id === 'backlog' ? 'text-yellow-600 bg-yellow-200 dark:text-yellow-300 dark:bg-yellow-700' : col.id === 'pending' ? 'text-pink-600 bg-pink-200 dark:text-pink-300 dark:bg-pink-700' : col.id === 'in_process' ? 'text-purple-600 bg-purple-200 dark:text-purple-300 dark:bg-purple-700' : 'text-green-600 bg-green-200 dark:text-green-300 dark:bg-green-700'}`}>{tasksByStatus[col.id].length}</span>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300"
                    onClick={() => onCreateTask(col.id)}
                  >
                    <PlusCircle className="h-3.5 w-3.5" />
                  </Button>
                </div>
                {/* Cards da coluna */}
                <div className="flex-1 p-3 space-y-3 overflow-y-auto">
                  {tasksByStatus[col.id].length > 0 ? (
                    tasksByStatus[col.id].map((task, idx) => (
                      <Draggable draggableId={String(task.id)} index={idx} key={task.id}>
                        {(provided: any) => (
                          <div
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            {...provided.dragHandleProps}
                            style={{ ...provided.draggableProps.style }}
                            className="rounded-2xl bg-white dark:bg-slate-800 shadow-sm border border-slate-200 dark:border-slate-700 hover:shadow-md transition-shadow duration-200 p-0"
                          >
                            <TaskCard {...task} onOpenDetails={onOpenDetails} />
                          </div>
                        )}
                      </Draggable>
                    ))
                  ) : (
                    <div className="flex flex-col items-center justify-center h-full text-sm text-slate-500 dark:text-slate-400 p-4">
                      <p className="mb-2">Nenhuma tarefa nesta coluna.</p>
                      <Button
                        variant="outline"
                        size="sm"
                        className="mt-2 border-dashed hover:border-solid border-slate-300 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300"
                        onClick={() => onCreateTask(col.id)}
                      >
                        <PlusCircle className="h-4 w-4 mr-1.5" />
                        Adicionar Tarefa
                      </Button>
                    </div>
                  )}
                  {/* Add the placeholder for react-beautiful-dnd */}
                  {provided.placeholder}
                </div>
                <div className="p-2 border-t border-slate-200 dark:border-slate-700">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full flex items-center justify-center py-2 text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                    onClick={() => onCreateTask(col.id)}
                  >
                    <PlusCircle className="h-4 w-4 mr-2" />
                    Adicionar Nova Tarefa
                  </Button>
                </div>
              </div>
            )}
          </Droppable>
        ))}
      </div>
    </DragDropContext>
  );
} 