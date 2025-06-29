import { useQuery } from "@tanstack/react-query";
import { format, isToday } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CalendarClock, MapPin, User, Clock } from "lucide-react";
import { Link } from "wouter";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { TooltipProvider, Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";

type SessionStatus = 'scheduled' | 'completed' | 'cancelled' | 'no-show';

interface Session {
  id: number;
  startTime: string;
  endTime: string;
  leadId: number;
  trainerId: number;
  location: string;
  status: SessionStatus;
  source: 'Favale' | 'Pink' | 'FavalePink';
  notes?: string;
  value?: number;
  service?: string;
}

interface TodayAppointmentCardProps {
  className?: string;
}

export default function TodayAppointmentCard({ className = "" }: TodayAppointmentCardProps) {
  // Fetch sessions from API
  const { data: sessions = [], isLoading, error } = useQuery({
    queryKey: ['/api/sessions'],
    queryFn: () => fetch('/api/sessions').then(res => res.json())
  });

  // Fetch leads for student names
  const { data: leads = [] } = useQuery({
    queryKey: ['/api/leads'],
    queryFn: () => fetch('/api/leads').then(res => res.json())
  });

  // Fetch trainers for trainer names
  const { data: trainers = [] } = useQuery({
    queryKey: ['/api/trainers'],
    queryFn: () => fetch('/api/trainers').then(res => res.json())
  });

  // Helper functions to get names from IDs
  const getStudentName = (leadId: number) => {
    const lead = leads.find((l: any) => l.id === leadId);
    return lead?.name || 'Estudante';
  };

  const getTrainerName = (trainerId: number) => {
    const trainer = trainers.find((t: any) => t.id === trainerId);
    return trainer?.name || 'Professor';
  };

  // Filter sessions for today only and sort by time
  const todaySessions = sessions
    .filter((session: any) => isToday(new Date(session.startTime)))
    .sort((a: any, b: any) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());

  const getStatusBadge = (status: string) => {
    const statusLower = status.toLowerCase();
    switch (statusLower) {
      case "agendado":
      case "scheduled":
        return <Badge variant="outline" className="bg-blue-50 text-blue-600 border-blue-200">Agendado</Badge>;
      case "concluído":
      case "completed":
        return <Badge variant="outline" className="bg-green-50 text-green-600 border-green-200">Concluído</Badge>;
      case "cancelado":
      case "cancelled":
        return <Badge variant="outline" className="bg-red-50 text-red-600 border-red-200">Cancelado</Badge>;
      case "remarcado":
      case "rescheduled":
        return <Badge variant="outline" className="bg-purple-50 text-purple-600 border-purple-200">Remarcado</Badge>;
      case "não compareceu":
      case "no-show":
        return <Badge variant="outline" className="bg-amber-50 text-amber-600 border-amber-200">Não Compareceu</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <Card variant="glowIntenseLifted" className={`flex flex-col h-full p-3 sm:p-5 ${className}`}>
      <div className="flex justify-between items-center mb-3 sm:mb-4 border-b dark:border-primary/20 pb-3">
        <div className="flex items-center gap-2">
          <CalendarClock className="h-5 w-5 text-[#ff9810]" />
          <h3 className="font-heading text-base sm:text-lg font-medium dark:text-white dark:glow-title">Agendamentos de Hoje</h3>
        </div>
        <Link href="/calendario">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8 text-gray-400 hover:text-secondary transition-all duration-200 dark:text-gray-300 dark:hover:text-pink-400 hover:scale-110 dark:hover:glow-text">
                  <span className="material-icons text-base sm:text-lg">calendar_month</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Ver calendário completo</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </Link>
      </div>

      <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-200 dark:scrollbar-thumb-slate-700 scrollbar-track-transparent">
        {isLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-20 w-full" />
          </div>
        ) : todaySessions.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-32 text-center text-gray-500 dark:text-gray-400">
            <CalendarClock className="h-8 w-8 mb-2 opacity-50" />
            <p className="text-sm">Nenhum agendamento para hoje</p>
            <Link href="/agendamentos">
              <Button variant="outline" size="sm" className="mt-2 text-xs">
                Agendar Sessão
              </Button>
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {todaySessions.map((session: Session) => (
              <div key={session.id} className={`p-3 rounded-lg border transition-colors hover:bg-gray-50 dark:hover:bg-gray-800/50 ${session.source === 'Favale' ? 'border-l-4 border-l-blue-500' : 'border-l-4 border-l-pink-500'}`}>
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-gray-400" />
                    <span className="text-sm font-medium text-gray-900 dark:text-white">
                      {format(new Date(session.startTime), 'HH:mm')} - {format(new Date(session.endTime), 'HH:mm')}
                    </span>
                  </div>
                  {getStatusBadge(session.status)}
                </div>
                
                <div className="flex items-center gap-2 mb-1">
                  <User className="h-3.5 w-3.5 text-gray-400" />
                  <span className="text-sm text-gray-700 dark:text-gray-300">
                    {getStudentName(session.leadId)} com {getTrainerName(session.trainerId)}
                  </span>
                </div>
                
                <div className="flex items-center gap-2">
                  <MapPin className="h-3.5 w-3.5 text-gray-400" />
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    {session.location}
                  </span>
                  <Badge variant="outline" className={`ml-auto text-xs ${session.source === 'Favale' ? 'bg-blue-50 text-blue-600 border-blue-200' : 'bg-pink-50 text-pink-600 border-pink-200'}`}>
                    {session.source}
                  </Badge>
                </div>
                
                {session.notes && (
                  <div className="mt-2 text-xs text-gray-500 dark:text-gray-400 italic">
                    {session.notes}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </Card>
  );
}