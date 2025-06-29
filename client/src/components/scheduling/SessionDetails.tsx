import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { CalendarIcon, Clock, FileEdit, MapPin, User, X } from 'lucide-react';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';

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

interface SessionDetailsProps {
  session: Session;
  onCancelSession: (id: number) => void;
  onCompleteSession: (id: number) => void;
  onEditSession: (id: number) => void;
}

export function SessionDetails({ session, onCancelSession, onCompleteSession, onEditSession }: SessionDetailsProps) {
  const [cancelAlertOpen, setCancelAlertOpen] = useState(false);
  
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
  
  function getStatusClass(status: SessionStatus): string {
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

  return (
    <div className="space-y-6">
      {/* Cabeçalho com data e origem */}
      <div className="flex justify-between items-start">
        <div className="flex items-center gap-2">
          <CalendarIcon className="h-5 w-5 text-muted-foreground" />
          <h3 className="text-lg font-semibold">
            {format(new Date(session.startTime), "PPP", { locale: ptBR })}
          </h3>
        </div>
        
        <Badge 
          variant="outline" 
          className={session.source === 'Favale' ? 
            'bg-blue-50 text-blue-700 border-blue-300 dark:bg-blue-950 dark:text-blue-300 dark:border-blue-800' : 
            'bg-pink-50 text-pink-700 border-pink-300 dark:bg-pink-950 dark:text-pink-300 dark:border-pink-800'}
        >
          {session.source}
        </Badge>
      </div>
      
      {/* Status */}
      <div className="flex justify-between items-center">
        <span className="text-sm text-muted-foreground">Status:</span>
        <Badge variant="outline" className={getStatusClass(session.status)}>
          {getStatusText(session.status)}
        </Badge>
      </div>
      
      {/* Detalhes da sessão */}
      <div className="space-y-3 text-sm">
        <div className="flex items-center gap-2">
          <Clock className="h-4 w-4 text-muted-foreground" />
          <span>
            {format(new Date(session.startTime), 'HH:mm', { locale: ptBR })} - 
            {format(new Date(session.endTime), 'HH:mm', { locale: ptBR })}
          </span>
        </div>
        
        <div className="flex items-center gap-2">
          <User className="h-4 w-4 text-muted-foreground" />
          <span>
            <span className="font-medium">Aluno:</span> {getStudentName(session.leadId)}
          </span>
        </div>
        
        <div className="flex items-center gap-2">
          <User className="h-4 w-4 text-muted-foreground" />
          <span>
            <span className="font-medium">Professor:</span> {getTrainerName(session.trainerId)}
          </span>
        </div>
        
        <div className="flex items-start gap-2">
          <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
          <span>
            <span className="font-medium">Local:</span> {session.location}
          </span>
        </div>
        
        {session.notes && (
          <div className="border rounded-md p-3 mt-2">
            <p className="font-medium mb-1">Observações:</p>
            <p className="text-muted-foreground">{session.notes}</p>
          </div>
        )}
      </div>
      
      {/* Botões de ação */}
      <div className="flex flex-col gap-2 pt-2">
        {session.status === 'scheduled' && (
          <>
            <Button variant="outline" onClick={() => onEditSession(session.id)}>
              <FileEdit className="h-4 w-4 mr-2" />
              Editar Sessão
            </Button>
            
            <Button variant="outline" onClick={() => onCompleteSession(session.id)}>
              Marcar como Concluída
            </Button>
            
            <Button variant="outline" className="text-red-500 hover:text-red-600" onClick={() => setCancelAlertOpen(true)}>
              <X className="h-4 w-4 mr-2" />
              Cancelar Sessão
            </Button>
          </>
        )}
      </div>
      
      {/* Alerta de confirmação para cancelamento */}
      <AlertDialog open={cancelAlertOpen} onOpenChange={setCancelAlertOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancelar Sessão</AlertDialogTitle>
            <AlertDialogDescription>
              Você tem certeza que deseja cancelar esta sessão? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Voltar</AlertDialogCancel>
            <AlertDialogAction onClick={() => onCancelSession(session.id)} className="bg-red-500 hover:bg-red-600">
              Sim, cancelar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}