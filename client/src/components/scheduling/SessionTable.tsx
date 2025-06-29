import React, { useState, useMemo } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useQuery } from '@tanstack/react-query';
import { RecurringSessionCard } from './RecurringSessionCard';
import { groupSessions } from '@/utils/sessionGrouping';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Check, FileEdit, MoreVertical, X } from 'lucide-react';
import { SessionDetails } from './SessionDetails';
import { SessionForm } from './SessionForm';
import { useToast } from '@/hooks/use-toast';

type SessionStatus = 'scheduled' | 'completed' | 'cancelled' | 'no-show' | 'agendado' | 'concluído' | 'cancelado';

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
  recurrenceType?: string;
  recurrenceGroupId?: string;
  isRecurrenceParent?: boolean;
  parentSessionId?: number;
}

interface SessionTableProps {
  sessions: Session[];
  onRefresh: () => void;
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
    case 'agendado':
      return 'Agendada';
    case 'completed':
    case 'concluído':
      return 'Concluída';
    case 'cancelled':
    case 'cancelado':
      return 'Cancelada';
    case 'no-show':
      return 'Não Compareceu';
    default:
      return status;
  }
}

function getStatusBadge(status: SessionStatus) {
  const variant = getStatusBadgeVariant(status);
  const text = getStatusText(status);
  
  return (
    <Badge className={`${variant} border-0`}>
      {text}
    </Badge>
  );
}

export function SessionTable({ sessions, onRefresh }: SessionTableProps) {
  const [selectedSession, setSelectedSession] = useState<Session | null>(null);
  const [viewDetailsOpen, setViewDetailsOpen] = useState(false);
  const [editSessionOpen, setEditSessionOpen] = useState(false);
  const { toast } = useToast();
  
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

  // Group sessions into recurring and individual
  const groupedSessions = useMemo(() => {
    return groupSessions(sessions, getStudentName, getTrainerName);
  }, [sessions, leads, trainers]);
  
  const handleCancelSession = async (id: number) => {
    try {
      const response = await fetch(`/api/sessions/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'cancelled' })
      });
      
      if (response.ok) {
        toast({
          title: 'Sessão cancelada',
          description: 'A sessão foi cancelada com sucesso.',
        });
        setViewDetailsOpen(false);
        onRefresh();
      } else {
        throw new Error('Erro ao cancelar sessão');
      }
    } catch (error) {
      toast({
        title: 'Erro',
        description: 'Não foi possível cancelar a sessão.',
        variant: 'destructive'
      });
    }
  };
  
  const handleCompleteSession = async (id: number) => {
    try {
      const response = await fetch(`/api/sessions/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'completed' })
      });
      
      if (response.ok) {
        toast({
          title: 'Sessão concluída',
          description: 'A sessão foi marcada como concluída.',
        });
        setViewDetailsOpen(false);
        onRefresh();
      } else {
        throw new Error('Erro ao marcar sessão como concluída');
      }
    } catch (error) {
      toast({
        title: 'Erro',
        description: 'Não foi possível marcar a sessão como concluída.',
        variant: 'destructive'
      });
    }
  };

  const openSessionDetails = (session: Session) => {
    setSelectedSession(session);
    setViewDetailsOpen(true);
  };

  const openEditSession = (session: Session) => {
    setSelectedSession(session);
    setViewDetailsOpen(false);
    setEditSessionOpen(true);
  };

  return (
    <>
      <div className="space-y-4">
        {/* Sessões Recorrentes */}
        {groupedSessions.recurring.length > 0 && (
          <div className="space-y-3">
            <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-2">
              <div className="h-4 w-4 rounded-full bg-blue-100 flex items-center justify-center">
                <div className="h-2 w-2 rounded-full bg-blue-600"></div>
              </div>
              Sessões Recorrentes ({groupedSessions.recurring.length})
            </h3>
            {groupedSessions.recurring.map((group, index) => (
              <RecurringSessionCard
                key={`recurring-${index}`}
                group={group}
                onEditSession={(session) => openSessionDetails(session)}
                onCancelSession={handleCancelSession}
                onCompleteSession={handleCompleteSession}
              />
            ))}
          </div>
        )}

        {/* Sessões Individuais */}
        {groupedSessions.individual.length > 0 && (
          <div className="space-y-3">
            {groupedSessions.recurring.length > 0 && (
              <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-2">
                <div className="h-4 w-4 rounded-full bg-gray-100 flex items-center justify-center">
                  <div className="h-2 w-2 rounded-full bg-gray-600"></div>
                </div>
                Sessões Individuais ({groupedSessions.individual.length})
              </h3>
            )}
            <div className="rounded-md border overflow-hidden">
              <div className="hidden md:block">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Data/Horário</TableHead>
                      <TableHead>Aluno</TableHead>
                      <TableHead>Professor</TableHead>
                      <TableHead className="hidden lg:table-cell">Local</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                <TableBody>
                  {groupedSessions.individual.map((session) => (
                    <TableRow key={session.id} className="cursor-pointer hover:bg-muted/50" onClick={() => openSessionDetails(session)}>
                      <TableCell>
                        <div>
                          <div className="font-medium">
                            {format(new Date(session.startTime), 'dd/MM/yyyy', { locale: ptBR })}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {format(new Date(session.startTime), 'HH:mm', { locale: ptBR })} - 
                            {format(new Date(session.endTime), 'HH:mm', { locale: ptBR })}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Badge 
                            variant="outline" 
                            className={session.source === 'Favale' ? 
                              'h-2 w-2 rounded-full bg-blue-500 p-0' : 
                              'h-2 w-2 rounded-full bg-pink-500 p-0'}
                          />
                          {getStudentName(session.leadId)}
                        </div>
                      </TableCell>
                      <TableCell>{getTrainerName(session.trainerId)}</TableCell>
                      <TableCell className="hidden md:table-cell truncate max-w-xs">{session.location}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={getStatusBadgeVariant(session.status)}>
                          {getStatusText(session.status)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                            <Button variant="ghost" className="h-8 w-8 p-0">
                              <span className="sr-only">Abrir menu</span>
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Ações</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={(e) => {
                              e.stopPropagation();
                              openSessionDetails(session);
                            }}>
                              Ver detalhes
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={(e) => {
                              e.stopPropagation();
                              openEditSession(session);
                            }}>
                              <FileEdit className="mr-2 h-4 w-4" />
                              Editar sessão
                            </DropdownMenuItem>
                            {session.status === 'scheduled' && (
                              <>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem 
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleCompleteSession(session.id);
                                  }}
                                  className="text-green-600"
                                >
                                  <Check className="mr-2 h-4 w-4" />
                                  Marcar como concluída
                                </DropdownMenuItem>
                                <DropdownMenuItem 
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleCancelSession(session.id);
                                  }}
                                  className="text-red-600"
                                >
                                  <X className="mr-2 h-4 w-4" />
                                  Cancelar sessão
                                </DropdownMenuItem>
                              </>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
                </Table>
              </div>
              
              {/* Mobile view */}
              <div className="md:hidden space-y-3 p-4">
                {groupedSessions.individual.map((session) => (
                  <div key={session.id} className="bg-white dark:bg-gray-800 border rounded-lg p-4 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors" onClick={() => openSessionDetails(session)}>
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <div className="font-medium text-sm">
                          {format(new Date(session.startTime), 'dd/MM/yyyy', { locale: ptBR })}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {format(new Date(session.startTime), 'HH:mm', { locale: ptBR })} - {format(new Date(session.endTime), 'HH:mm', { locale: ptBR })}
                        </div>
                      </div>
                      {getStatusBadge(session.status)}
                    </div>
                    
                    <div className="space-y-1 mb-3">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className={session.source === 'Favale' ? 'bg-blue-50 text-blue-600 border-blue-200' : 'bg-pink-50 text-pink-600 border-pink-200'}>
                          {session.source}
                        </Badge>
                        <span className="text-sm font-medium">{getStudentName(session.leadId)}</span>
                      </div>
                      <div className="text-sm text-muted-foreground">
                        Professor: {getTrainerName(session.trainerId)}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        Local: {session.location}
                      </div>
                    </div>
                    
                    <div className="flex justify-end">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={(e) => e.stopPropagation()}>
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={(e) => {
                            e.stopPropagation();
                            openSessionDetails(session);
                          }}>
                            Ver detalhes
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={(e) => {
                            e.stopPropagation();
                            openEditSession(session);
                          }}>
                            Editar sessão
                          </DropdownMenuItem>
                          {session.status === 'scheduled' && (
                            <>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleCompleteSession(session.id);
                                }}
                                className="text-green-600"
                              >
                                Marcar como concluída
                              </DropdownMenuItem>
                              <DropdownMenuItem 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleCancelSession(session.id);
                                }}
                                className="text-red-600"
                              >
                                Cancelar sessão
                              </DropdownMenuItem>
                            </>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Estado vazio */}
        {groupedSessions.recurring.length === 0 && groupedSessions.individual.length === 0 && (
          <div className="text-center py-12 border rounded-lg bg-gray-50 dark:bg-gray-800/50">
            <div className="text-gray-500 dark:text-gray-400">
              <div className="text-lg font-medium mb-2">Nenhuma sessão encontrada</div>
              <div className="text-sm">Crie sua primeira sessão para começar</div>
            </div>
          </div>
        )}
      </div>

      {/* Dialog para visualizar detalhes da sessão */}
      <Dialog open={viewDetailsOpen} onOpenChange={setViewDetailsOpen}>
        <DialogContent className="sm:max-w-[625px]">
          <DialogHeader>
            <DialogTitle>Detalhes da Sessão</DialogTitle>
          </DialogHeader>
          {selectedSession && (
            <SessionDetails 
              session={selectedSession} 
              onCancelSession={handleCancelSession}
              onCompleteSession={handleCompleteSession}
              onEditSession={(id) => {
                setViewDetailsOpen(false);
                setEditSessionOpen(true);
              }}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Dialog para editar sessão */}
      <Dialog open={editSessionOpen} onOpenChange={setEditSessionOpen}>
        <DialogContent className="sm:max-w-[650px]">
          <DialogHeader>
            <DialogTitle>Editar Sessão</DialogTitle>
          </DialogHeader>
          {selectedSession && (
            <SessionForm 
              sessionId={selectedSession.id}
              defaultValues={{
                date: new Date(selectedSession.startTime),
                startTime: format(new Date(selectedSession.startTime), 'HH:mm'),
                endTime: format(new Date(selectedSession.endTime), 'HH:mm'),
                location: selectedSession.location,
                source: selectedSession.source as 'Favale' | 'Pink',
                leadId: selectedSession.leadId,
                trainerId: selectedSession.trainerId,
                notes: selectedSession.notes || '',
              }}
              onSuccess={() => {
                setEditSessionOpen(false);
                onRefresh();
              }}
            />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}