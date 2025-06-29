import { useState, useEffect } from 'react';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { NewSessionForm } from './NewSessionForm';
import { format, addDays, setHours, setMinutes, isSameDay, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { CalendarIcon, Plus, Clock, MapPin, User, ArrowLeft } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Avatar } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { Link } from 'wouter';
import { useQuery, useQueryClient } from '@tanstack/react-query';

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

export function SessionCalendar() {
  const [date, setDate] = useState<Date>(new Date());
  const [dialogOpen, setDialogOpen] = useState(false);
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);
  const [selectedSession, setSelectedSession] = useState<Session | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
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

  // Helper function to get student name by leadId
  const getStudentName = (leadId: number) => {
    const lead = leads.find((l: any) => l.id === leadId);
    return lead?.name || 'Estudante';
  };

  // Helper function to get trainer name by trainerId
  const getTrainerName = (trainerId: number) => {
    const trainer = trainers.find((t: any) => t.id === trainerId);
    return trainer?.name || 'Professor';
  };

  // Filtrar sessões para o dia selecionado
  const sessionsForSelectedDay = sessions.filter((session: Session) => 
    isSameDay(new Date(session.startTime), date)
  );

  const handleAddSession = () => {
    setDialogOpen(true);
  };

  const handleSessionClick = (session: Session) => {
    setSelectedSession(session);
    setDetailsDialogOpen(true);
  };

  const getStatusBadge = (status: SessionStatus) => {
    switch(status) {
      case 'scheduled':
        return <Badge variant="outline" className="bg-blue-50 text-blue-600 border-blue-200">Agendado</Badge>;
      case 'completed':
        return <Badge variant="outline" className="bg-green-50 text-green-600 border-green-200">Concluído</Badge>;
      case 'cancelled':
        return <Badge variant="outline" className="bg-red-50 text-red-600 border-red-200">Cancelado</Badge>;
      case 'no-show':
        return <Badge variant="outline" className="bg-amber-50 text-amber-600 border-amber-200">Não Compareceu</Badge>;
      default:
        return null;
    }
  };

  return (
    <div className="space-y-4 animate-in fade-in-50 duration-300">
      <div className="flex items-center justify-between mb-4">
        <Link href="/agendamentos">
          <Button variant="ghost" className="flex items-center gap-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors">
            <ArrowLeft className="h-4 w-4" />
            Voltar para Agendamentos
          </Button>
        </Link>
        
        <Button onClick={handleAddSession} className="bg-[#ff9810] hover:bg-[#ff9810]/90 text-white shadow-sm">
          <Plus className="h-4 w-4 mr-2" />
          Nova Sessão
        </Button>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Coluna do calendário */}
        <div className="lg:col-span-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm p-4">
            <h3 className="text-lg font-medium mb-4 text-gray-800 dark:text-white">Calendário</h3>
            
            <CalendarComponent
              mode="single"
              selected={date}
              onSelect={(date) => setDate(date || new Date())}
              className="rounded-md w-full"
              locale={ptBR}
              showOutsideDays={true}
              modifiers={{
                highlighted: (date) => date && sessions.some(session => 
                  isSameDay(new Date(session.startTime), date)
                ),
              }}
              modifiersClassNames={{
                today: 'bg-[#ff9810]/10 text-[#ff9810] font-semibold',
                highlighted: 'font-bold bg-gray-50 dark:bg-gray-700/30',
              }}
              classNames={{
                day_selected: 'bg-[#ff9810] text-white hover:bg-[#ff9810]/90 focus:bg-[#ff9810]',
                day_today: 'bg-[#ff9810]/10 text-[#ff9810] font-semibold',
              }}
            />

            <div className="mt-6 space-y-4">
              <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">Origem das Sessões</h4>
              <div className="flex flex-col space-y-2">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                  <span className="text-sm text-gray-600 dark:text-gray-400">Favale</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-pink-500"></div>
                  <span className="text-sm text-gray-600 dark:text-gray-400">Pink</span>
                </div>
              </div>
              
              <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-700">
                <Button onClick={handleAddSession} className="w-full bg-[#ff9810]/10 hover:bg-[#ff9810]/20 text-[#ff9810]">
                  <Plus className="h-4 w-4 mr-2" />
                  Agendar para {format(date, "dd 'de' MMMM", { locale: ptBR })}
                </Button>
              </div>
            </div>
          </div>
        </div>
        
        {/* Coluna de detalhes da data selecionada */}
        <div className="lg:col-span-8">
          <div className="bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-xl shadow-sm flex flex-col h-full overflow-hidden">
            {/* Cabeçalho do painel */}
            <div className="border-b border-gray-100 dark:border-gray-700 p-4 bg-gray-50/80 dark:bg-gray-800/40">
              <div className="flex justify-between items-center">
                <div className="flex items-center">
                  <CalendarIcon className="h-5 w-5 mr-2 text-[#ff9810]" />
                  <h3 className="text-lg font-medium text-gray-800 dark:text-white">
                    {format(date, "EEEE, dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                  </h3>
                </div>
                <Badge variant="secondary" className="rounded-full font-medium px-3 py-1">
                  {isLoading ? "..." : sessionsForSelectedDay.length} sessões
                </Badge>
              </div>
            </div>
            
            {/* Conteúdo do painel */}
            <div className="flex-1 p-4 overflow-y-auto">
              {isLoading ? (
                <div className="space-y-4">
                  <Skeleton className="h-24 w-full" />
                  <Skeleton className="h-24 w-full" />
                  <Skeleton className="h-24 w-full" />
                </div>
              ) : sessionsForSelectedDay.length === 0 ? (
                <div className="h-full flex flex-col justify-center items-center py-12 text-muted-foreground">
                  <div className="p-4 rounded-full bg-gray-50 dark:bg-gray-700/30 mb-4">
                    <CalendarIcon className="h-8 w-8 text-gray-400 dark:text-gray-500" />
                  </div>
                  <p className="text-gray-500 dark:text-gray-400 mb-2">Não há sessões agendadas para esta data.</p>
                  <Button variant="outline" onClick={handleAddSession} className="mt-4">
                    <Plus className="h-4 w-4 mr-2" />
                    Agendar Sessão
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  {sessionsForSelectedDay.map((session) => (
                    <div key={session.id} 
                      onClick={() => handleSessionClick(session)}
                      className={`bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 ${session.source === 'Favale' ? 'border-l-blue-500' : 'border-l-pink-500'} border-l-4 rounded-lg p-4 shadow-sm hover:shadow-md transition-all duration-200 cursor-pointer`}
                    >
                      <div className="flex justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <Clock className="h-4 w-4 text-gray-400" />
                            <p className="font-medium text-gray-800 dark:text-white">
                              {format(new Date(session.startTime), 'HH:mm', { locale: ptBR })} - 
                              {format(new Date(session.endTime), 'HH:mm', { locale: ptBR })}
                            </p>
                            {getStatusBadge(session.status)}
                          </div>
                          
                          <div className="flex items-center gap-2 mb-2">
                            <Avatar className="h-6 w-6 bg-gray-200">
                              <div className="text-xs">{getStudentName(session.leadId).charAt(0)}</div>
                            </Avatar>
                            <p className="text-gray-700 dark:text-gray-300">
                              {getStudentName(session.leadId)} com <span className="font-medium">{getTrainerName(session.trainerId)}</span>
                            </p>
                          </div>
                          
                          <div className="flex items-center gap-3 text-sm text-gray-500 dark:text-gray-400 mt-2">
                            <MapPin className="h-3.5 w-3.5" />
                            <span>{session.location}</span>
                          </div>
                        </div>
                        
                        <Badge 
                          variant="outline" 
                          className={session.source === 'Favale' ? 
                            'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/20 dark:text-blue-300 dark:border-blue-700/40 h-fit' : 
                            'bg-pink-50 text-pink-700 border-pink-200 dark:bg-pink-900/20 dark:text-pink-300 dark:border-pink-700/40 h-fit'}
                        >
                          {session.source}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Dialog para adicionar nova sessão */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-[650px] bg-white dark:bg-gray-800 border-gray-100 dark:border-gray-700 rounded-xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold text-gray-800 dark:text-white">
              Agendar Nova Sessão
            </DialogTitle>
            <DialogDescription className="text-gray-500 dark:text-gray-400">
              Preencha os dados para agendar uma nova sessão.
            </DialogDescription>
          </DialogHeader>
          <NewSessionForm 
            defaultValues={{ date: date, startTime: '09:00', endTime: '10:00' }}
            onSuccess={() => {
              setDialogOpen(false);
              toast({
                title: 'Sessão agendada',
                description: 'A sessão foi agendada com sucesso!',
              });
            }} 
          />
        </DialogContent>
      </Dialog>

      {/* Dialog para exibir detalhes da sessão */}
      {selectedSession && (
        <Dialog open={detailsDialogOpen} onOpenChange={setDetailsDialogOpen}>
          <DialogContent className="sm:max-w-[500px] bg-white dark:bg-gray-800 border-gray-100 dark:border-gray-700 rounded-xl">
            <DialogHeader>
              <DialogTitle className="text-xl font-semibold text-gray-800 dark:text-white flex items-center gap-2">
                <span className={`inline-block w-3 h-3 rounded-full ${selectedSession.source === 'Favale' ? 'bg-blue-500' : 'bg-pink-500'}`}></span>
                Detalhes da Sessão
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-5 py-2">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-gray-500 dark:text-gray-400 text-sm">Data e Horário</p>
                  <p className="font-medium text-gray-800 dark:text-white">
                    {format(new Date(selectedSession.startTime), "dd 'de' MMMM, yyyy", { locale: ptBR })}
                  </p>
                  <p className="text-gray-800 dark:text-white">
                    {format(new Date(selectedSession.startTime), 'HH:mm', { locale: ptBR })} - 
                    {format(new Date(selectedSession.endTime), 'HH:mm', { locale: ptBR })}
                  </p>
                </div>
                {getStatusBadge(selectedSession.status)}
              </div>

              <div className="p-4 bg-gray-50 dark:bg-gray-700/30 rounded-lg space-y-4">
                <div>
                  <p className="text-gray-500 dark:text-gray-400 text-sm">Aluno</p>
                  <div className="flex items-center gap-2 mt-1">
                    <Avatar className="h-8 w-8 bg-gray-200">
                      <div className="text-xs">{getStudentName(selectedSession.leadId).charAt(0)}</div>
                    </Avatar>
                    <p className="font-medium text-gray-800 dark:text-white">{getStudentName(selectedSession.leadId)}</p>
                  </div>
                </div>

                <div>
                  <p className="text-gray-500 dark:text-gray-400 text-sm">Professor</p>
                  <div className="flex items-center gap-2 mt-1">
                    <Avatar className="h-8 w-8 bg-gray-200">
                      <div className="text-xs">{getTrainerName(selectedSession.trainerId).charAt(0)}</div>
                    </Avatar>
                    <p className="font-medium text-gray-800 dark:text-white">{getTrainerName(selectedSession.trainerId)}</p>
                  </div>
                </div>
              </div>

              <div>
                <p className="text-gray-500 dark:text-gray-400 text-sm">Local</p>
                <p className="font-medium text-gray-800 dark:text-white">{selectedSession.location}</p>
              </div>

              {selectedSession.notes && (
                <div>
                  <p className="text-gray-500 dark:text-gray-400 text-sm">Observações</p>
                  <p className="text-gray-800 dark:text-white">{selectedSession.notes}</p>
                </div>
              )}

              <div className="flex justify-between pt-4 border-t border-gray-100 dark:border-gray-700">
                <Button variant="outline" onClick={() => setDetailsDialogOpen(false)}>
                  Fechar
                </Button>
                <div className="flex gap-2">
                  <Button variant="outline" className="border-amber-300 bg-amber-50 hover:bg-amber-100 text-amber-700">
                    Editar
                  </Button>
                  <Button variant="outline" className="border-red-300 bg-red-50 hover:bg-red-100 text-red-700">
                    Cancelar Sessão
                  </Button>
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}