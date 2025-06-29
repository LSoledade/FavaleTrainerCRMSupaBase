import React, { useState } from 'react';
import { format, isSameDay, startOfWeek, addDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  ChevronDown, 
  ChevronRight, 
  Repeat, 
  Calendar,
  Clock,
  User,
  MapPin
} from 'lucide-react';
import { cn } from '@/lib/utils';

type SessionStatus = 'scheduled' | 'completed' | 'cancelled' | 'no-show';

interface Session {
  id: number;
  startTime: string;
  endTime: string;
  location: string;
  source: 'Favale' | 'Pink' | 'FavalePink';
  notes?: string;
  status: SessionStatus;
  leadId: number;
  trainerId: number;
  value?: number;
  service?: string;
}

interface RecurringGroup {
  pattern: string;
  sessions: Session[];
  studentName: string;
  trainerName: string;
  source: 'Favale' | 'Pink' | 'FavalePink';
  location: string;
  timeSlot: string;
  nextSession?: Session;
}

interface RecurringSessionGroupProps {
  group: RecurringGroup;
  onSessionClick: (session: Session) => void;
  getStudentName: (leadId: number) => string;
  getTrainerName: (trainerId: number) => string;
}

function getStatusBadgeVariant(status: SessionStatus) {
  switch (status) {
    case 'scheduled':
      return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300';
    case 'completed':
      return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300';
    case 'cancelled':
      return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300';
    case 'no-show':
      return 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-300';
    default:
      return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300';
  }
}

function getStatusText(status: SessionStatus): string {
  switch (status) {
    case 'scheduled':
      return 'Agendada';
    case 'completed':
      return 'Concluída';
    case 'cancelled':
      return 'Cancelada';
    case 'no-show':
      return 'Não Compareceu';
    default:
      return status;
  }
}

export function RecurringSessionGroup({ 
  group, 
  onSessionClick, 
  getStudentName, 
  getTrainerName 
}: RecurringSessionGroupProps) {
  const [isOpen, setIsOpen] = useState(false);
  
  const upcomingSessions = group.sessions.filter(s => 
    new Date(s.startTime) > new Date() && s.status === 'scheduled'
  ).length;

  const completedSessions = group.sessions.filter(s => 
    s.status === 'completed'
  ).length;

  const nextSession = group.sessions
    .filter(s => new Date(s.startTime) > new Date() && s.status === 'scheduled')
    .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime())[0];

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <div className="border rounded-lg bg-white dark:bg-gray-800 shadow-sm hover:shadow-md transition-shadow">
        <CollapsibleTrigger asChild>
          <div className="p-4 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50 rounded-t-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="flex items-center space-x-2">
                  {isOpen ? (
                    <ChevronDown className="h-4 w-4 text-gray-500" />
                  ) : (
                    <ChevronRight className="h-4 w-4 text-gray-500" />
                  )}
                  <Repeat className="h-4 w-4 text-blue-600" />
                  <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                    Recorrente
                  </Badge>
                </div>
              </div>
              
              <div className="flex items-center space-x-2">
                <Badge 
                  variant="outline" 
                  className={group.source === 'Favale' ? 
                    'bg-blue-50 text-blue-700 border-blue-200' : 
                    'bg-pink-50 text-pink-700 border-pink-200'}
                >
                  {group.source}
                </Badge>
                <span className="text-sm text-gray-500">
                  {upcomingSessions} próximas • {completedSessions} concluídas
                </span>
              </div>
            </div>

            <div className="mt-3 space-y-2">
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-2">
                  <User className="h-4 w-4 text-gray-500" />
                  <span className="font-medium">{getStudentName(group.sessions[0].leadId)}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="text-gray-400">com</span>
                  <span className="text-gray-700 dark:text-gray-300">{getTrainerName(group.sessions[0].trainerId)}</span>
                </div>
              </div>

              <div className="flex items-center space-x-4 text-sm text-gray-600 dark:text-gray-400">
                <div className="flex items-center space-x-1">
                  <Clock className="h-3 w-3" />
                  <span>{group.timeSlot}</span>
                </div>
                <div className="flex items-center space-x-1">
                  <MapPin className="h-3 w-3" />
                  <span>{group.location}</span>
                </div>
                <div className="flex items-center space-x-1">
                  <Calendar className="h-3 w-3" />
                  <span>{group.pattern}</span>
                </div>
              </div>

              {nextSession && (
                <div className="mt-2 p-2 bg-blue-50 dark:bg-blue-900/20 rounded-md">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-blue-800 dark:text-blue-300">
                      Próxima sessão: {format(new Date(nextSession.startTime), "dd 'de' MMMM 'às' HH:mm", { locale: ptBR })}
                    </span>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-blue-700 hover:text-blue-800 h-6 px-2"
                      onClick={(e) => {
                        e.stopPropagation();
                        onSessionClick(nextSession);
                      }}
                    >
                      Ver detalhes
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <div className="border-t bg-gray-50 dark:bg-gray-800/50">
            <div className="p-4">
              <h4 className="font-medium text-gray-900 dark:text-white mb-3">
                Todas as sessões ({group.sessions.length})
              </h4>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {group.sessions
                  .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime())
                  .map((session) => (
                    <div
                      key={session.id}
                      className="flex items-center justify-between p-3 bg-white dark:bg-gray-800 rounded-md border cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50"
                      onClick={() => onSessionClick(session)}
                    >
                      <div className="flex items-center space-x-3">
                        <div>
                          <div className="font-medium text-sm">
                            {format(new Date(session.startTime), "dd 'de' MMMM", { locale: ptBR })}
                          </div>
                          <div className="text-xs text-gray-500">
                            {format(new Date(session.startTime), 'HH:mm', { locale: ptBR })} - 
                            {format(new Date(session.endTime), 'HH:mm', { locale: ptBR })}
                          </div>
                        </div>
                      </div>
                      <Badge variant="outline" className={getStatusBadgeVariant(session.status)}>
                        {getStatusText(session.status)}
                      </Badge>
                    </div>
                  ))}
              </div>
            </div>
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}