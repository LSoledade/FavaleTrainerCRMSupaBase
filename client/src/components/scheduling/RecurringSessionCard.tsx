import { useState } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ChevronDown, ChevronRight, Calendar, Clock, MapPin, User, Repeat, MoreVertical } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';

interface Session {
  id: number;
  startTime: string;
  endTime: string;
  location: string;
  source: 'Favale' | 'Pink' | 'FavalePink';
  notes?: string;
  status: string;
  leadId: number;
  trainerId: number;
  value?: number;
  service?: string;
  recurrenceType?: string;
  recurrenceGroupId?: string;
  isRecurrenceParent?: boolean;
  parentSessionId?: number;
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

interface RecurringSessionCardProps {
  group: RecurringGroup;
  onEditSession?: (session: Session) => void;
  onCancelSession?: (sessionId: number) => void;
  onCompleteSession?: (sessionId: number) => void;
}

export function RecurringSessionCard({ 
  group, 
  onEditSession, 
  onCancelSession, 
  onCompleteSession 
}: RecurringSessionCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const getStatusBadge = (status: string) => {
    const statusMap = {
      'agendado': { label: 'Agendado', variant: 'default' as const, color: 'bg-blue-100 text-blue-800 border-blue-200' },
      'scheduled': { label: 'Agendado', variant: 'default' as const, color: 'bg-blue-100 text-blue-800 border-blue-200' },
      'completed': { label: 'Concluído', variant: 'secondary' as const, color: 'bg-green-100 text-green-800 border-green-200' },
      'concluído': { label: 'Concluído', variant: 'secondary' as const, color: 'bg-green-100 text-green-800 border-green-200' },
      'cancelled': { label: 'Cancelado', variant: 'destructive' as const, color: 'bg-red-100 text-red-800 border-red-200' },
      'cancelado': { label: 'Cancelado', variant: 'destructive' as const, color: 'bg-red-100 text-red-800 border-red-200' },
      'no-show': { label: 'Não compareceu', variant: 'outline' as const, color: 'bg-orange-100 text-orange-800 border-orange-200' }
    };
    
    const statusInfo = statusMap[status as keyof typeof statusMap] || statusMap.agendado;
    return (
      <Badge className={`text-xs ${statusInfo.color}`}>
        {statusInfo.label}
      </Badge>
    );
  };

  const getSourceColor = (source: string) => {
    return source === 'Favale' 
      ? 'bg-blue-50 text-blue-600 border-blue-200' 
      : source === 'Pink'
      ? 'bg-pink-50 text-pink-600 border-pink-200'
      : 'bg-purple-50 text-purple-600 border-purple-200';
  };

  // Estatísticas do grupo
  const totalSessions = group.sessions.length;
  const completedSessions = group.sessions.filter(s => s.status === 'completed' || s.status === 'concluído').length;
  const upcomingSessions = group.sessions.filter(s => 
    new Date(s.startTime) > new Date() && (s.status === 'scheduled' || s.status === 'agendado')
  ).length;

  return (
    <Card className="border-l-4 border-l-blue-500 hover:shadow-md transition-shadow">
      <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
        <CollapsibleTrigger asChild>
          <div className="cursor-pointer">
            <CardContent className="p-4">
              <div className="flex items-start justify-between">
                <div className="flex-1 space-y-3">
                  {/* Header */}
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1">
                      {isExpanded ? (
                        <ChevronDown className="h-4 w-4 text-gray-500" />
                      ) : (
                        <ChevronRight className="h-4 w-4 text-gray-500" />
                      )}
                      <Repeat className="h-4 w-4 text-blue-500" />
                    </div>
                    
                    <div>
                      <h3 className="font-medium text-gray-900 dark:text-white">
                        {group.studentName}
                      </h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {group.pattern} • {group.timeSlot}
                      </p>
                    </div>

                    <Badge variant="outline" className={`ml-auto ${getSourceColor(group.source)}`}>
                      {group.source}
                    </Badge>
                  </div>

                  {/* Info Cards */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
                      <User className="h-4 w-4 flex-shrink-0" />
                      <span className="truncate">Prof. {group.trainerName}</span>
                    </div>
                    
                    <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
                      <MapPin className="h-4 w-4 flex-shrink-0" />
                      <span className="truncate">{group.location}</span>
                    </div>

                    <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300 sm:col-span-2 lg:col-span-1">
                      <Calendar className="h-4 w-4 flex-shrink-0" />
                      <span>{totalSessions} sessões</span>
                    </div>
                  </div>

                  {/* Statistics */}
                  <div className="flex flex-wrap gap-4 text-xs">
                    <span className="text-green-600 dark:text-green-400">
                      {completedSessions} concluídas
                    </span>
                    <span className="text-blue-600 dark:text-blue-400">
                      {upcomingSessions} próximas
                    </span>
                    {group.nextSession && (
                      <span className="text-orange-600 dark:text-orange-400">
                        Próxima: {format(new Date(group.nextSession.startTime), 'dd/MM', { locale: ptBR })}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </div>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <div className="border-t border-gray-100 dark:border-gray-700">
            <div className="p-4 space-y-3">
              <h4 className="font-medium text-gray-900 dark:text-white flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Todas as Sessões ({totalSessions})
              </h4>
              
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {group.sessions
                  .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime())
                  .map((session) => (
                    <div
                      key={session.id}
                      className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        <div className="text-sm">
                          <div className="font-medium text-gray-900 dark:text-white">
                            {format(new Date(session.startTime), 'EEEE, dd/MM/yyyy', { locale: ptBR })}
                          </div>
                          <div className="text-gray-600 dark:text-gray-400 flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {format(new Date(session.startTime), 'HH:mm')} - {format(new Date(session.endTime), 'HH:mm')}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {getStatusBadge(session.status)}
                        
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            {onEditSession && (
                              <DropdownMenuItem onClick={() => onEditSession(session)}>
                                Editar
                              </DropdownMenuItem>
                            )}
                            {session.status === 'agendado' || session.status === 'scheduled' ? (
                              <>
                                {onCompleteSession && (
                                  <DropdownMenuItem onClick={() => onCompleteSession(session.id)}>
                                    Marcar como Concluída
                                  </DropdownMenuItem>
                                )}
                                {onCancelSession && (
                                  <DropdownMenuItem 
                                    onClick={() => onCancelSession(session.id)}
                                    className="text-red-600"
                                  >
                                    Cancelar
                                  </DropdownMenuItem>
                                )}
                              </>
                            ) : null}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          </div>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}