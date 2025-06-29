import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { SessionTable } from './SessionTable';
import { NewSessionForm } from './NewSessionForm';
import { SessionReport } from './SessionReport';
import { Plus, Calendar, RefreshCw } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Link } from 'wouter';
import { Skeleton } from '@/components/ui/skeleton';
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

export function SessionManagement() {
  const [formDialogOpen, setFormDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // Fetch sessions from API
  const { data: sessions = [], isLoading, error, refetch } = useQuery({
    queryKey: ['/api/sessions'],
    queryFn: () => fetch('/api/sessions').then(res => res.json())
  });

  // Fetch leads for the form
  const { data: leads = [] } = useQuery({
    queryKey: ['/api/leads'],
    queryFn: () => fetch('/api/leads').then(res => res.json())
  });

  // Fetch trainers for the form
  const { data: trainers = [] } = useQuery({
    queryKey: ['/api/trainers'],
    queryFn: () => fetch('/api/trainers').then(res => res.json())
  });

  // Refresh sessions function
  const refreshSessions = async () => {
    try {
      await refetch();
      toast({
        title: 'Dados atualizados',
        description: 'As sessões foram atualizadas com sucesso.',
      });
    } catch (error) {
      toast({
        title: 'Erro ao atualizar',
        description: 'Não foi possível atualizar as sessões.',
        variant: 'destructive'
      });
    }
  };

  const handleFormSubmit = async (formData: any) => {
    setIsSubmitting(true);
    try {
      // Combine date and time into proper DateTime objects
      const startDateTime = new Date(`${formData.date.toISOString().split('T')[0]}T${formData.startTime}:00`);
      const endDateTime = new Date(`${formData.date.toISOString().split('T')[0]}T${formData.endTime}:00`);

      const sessionData = {
        startTime: startDateTime.toISOString(),
        endTime: endDateTime.toISOString(),
        leadId: formData.leadId,
        trainerId: formData.trainerId,
        location: formData.location,
        source: formData.source,
        value: formData.value,
        service: formData.service,
        notes: formData.notes || '',
        status: 'agendado',
        recurrenceType: formData.recurrenceType,
        recurrenceInterval: formData.recurrenceInterval,
        recurrenceWeekDays: formData.recurrenceWeekDays,
        recurrenceEndType: formData.recurrenceEndType,
        recurrenceEndDate: formData.recurrenceEndDate?.toISOString(),
        recurrenceEndCount: formData.recurrenceEndCount,
      };

      const response = await fetch('/api/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(sessionData),
      });

      if (!response.ok) {
        throw new Error('Erro ao criar sessão');
      }

      const result = await response.json();
      
      setFormDialogOpen(false);
      queryClient.invalidateQueries({ queryKey: ['/api/sessions'] });
      
      toast({
        title: 'Sessão criada com sucesso',
        description: result.recurring 
          ? `${result.count} sessões foram agendadas com base na recorrência configurada.`
          : 'A sessão foi agendada com sucesso.',
      });
    } catch (error) {
      toast({
        title: 'Erro ao agendar',
        description: 'Não foi possível agendar a sessão. Tente novamente.',
        variant: 'destructive'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFormCancel = () => {
    setFormDialogOpen(false);
  };

  return (
    <div className="space-y-4 animate-in fade-in-50 duration-300">
      <Tabs defaultValue="sessions" className="space-y-4">
        <div className="flex flex-col lg:flex-row lg:justify-between lg:items-center gap-4">
          <TabsList className="bg-background border dark:bg-gray-800/60 shadow-sm w-full sm:w-auto">
            <TabsTrigger value="sessions" className="text-sm data-[state=active]:bg-white dark:data-[state=active]:bg-gray-700 rounded-md flex-1 sm:flex-none">
              Agendamentos
            </TabsTrigger>
            <TabsTrigger value="reports" className="text-sm data-[state=active]:bg-white dark:data-[state=active]:bg-gray-700 rounded-md flex-1 sm:flex-none">
              Relatórios
            </TabsTrigger>
          </TabsList>
          
          <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
            <Button 
              variant="outline" 
              size="sm"
              onClick={refreshSessions}
              disabled={isLoading}
              className="text-gray-600 dark:text-gray-300 w-full sm:w-auto"
            >
              <RefreshCw className={`h-4 w-4 mr-1 ${isLoading ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Atualizar</span>
              <span className="sm:hidden">Atualizar</span>
            </Button>
            
            <Button 
              onClick={() => setFormDialogOpen(true)} 
              className="bg-[#ff9810] hover:bg-[#ff9810]/90 text-white shadow-sm w-full sm:w-auto"
              size="sm"
            >
              <Plus className="h-4 w-4 mr-1" />
              Nova Sessão
            </Button>
          </div>
        </div>
        
        <TabsContent value="sessions" className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:justify-end gap-2">
            <Link href="/calendario">
              <Button variant="ghost" className="flex items-center justify-center gap-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors w-full sm:w-auto">
                <Calendar className="h-4 w-4" />
                <span className="hidden sm:inline">Ver Calendário Completo</span>
                <span className="sm:hidden">Calendário</span>
              </Button>
            </Link>
          </div>
          
          <Card className="border-gray-100 dark:border-gray-800 shadow-sm rounded-xl overflow-hidden">
            <CardHeader className="bg-gray-50/80 dark:bg-gray-800/20 pb-3">
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle className="text-lg font-medium text-gray-800 dark:text-white">
                    Sessões Agendadas
                  </CardTitle>
                  <CardDescription className="text-gray-500 dark:text-gray-400 mt-1">
                    Visualize e gerencie todos os agendamentos.
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-4">
              {isLoading ? (
                <div className="space-y-3">
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-16 w-full" />
                  <Skeleton className="h-16 w-full" />
                  <Skeleton className="h-16 w-full" />
                </div>
              ) : (
                <SessionTable 
                  sessions={sessions} 
                  onRefresh={refreshSessions} 
                />
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="reports" className="space-y-4">
          <Card className="border-gray-100 dark:border-gray-800 shadow-sm rounded-xl overflow-hidden">
            <CardHeader className="bg-gray-50/80 dark:bg-gray-800/20 pb-3">
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle className="text-lg font-medium text-gray-800 dark:text-white">
                    Relatório de Sessões
                  </CardTitle>
                  <CardDescription className="text-gray-500 dark:text-gray-400 mt-1">
                    Gere relatórios detalhados por aluno, período ou categoria.
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-4">
              <SessionReport />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Dialog para adicionar nova sessão */}
      <Dialog open={formDialogOpen} onOpenChange={setFormDialogOpen}>
        <DialogContent className="sm:max-w-[900px] max-h-[90vh] overflow-y-auto bg-white dark:bg-gray-800 border-gray-100 dark:border-gray-700 rounded-xl">
          <NewSessionForm 
            leads={leads}
            trainers={trainers}
            onSubmit={handleFormSubmit}
            onCancel={handleFormCancel}
            isLoading={isSubmitting}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}