import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { addMinutes, format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { CalendarIcon, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { useQuery } from '@tanstack/react-query';

// Schema para validação do formulário de sessão
const sessionFormSchema = z.object({
  date: z.date({
    required_error: "Uma data de sessão é obrigatória.",
  }),
  startTime: z.string({
    required_error: "O horário de início é obrigatório.",
  }),
  endTime: z.string({
    required_error: "O horário de término é obrigatório.",
  }),
  location: z.string().min(1, "O local é obrigatório."),
  source: z.enum(["Favale", "Pink"], {
    required_error: "A origem é obrigatória.",
  }),
  leadId: z.number().min(1, "Um aluno deve ser selecionado."),
  trainerId: z.number().min(1, "Um professor deve ser selecionado."),
  notes: z.string().optional(),
}).refine(data => {
  // Validar se o horário de fim é depois do horário de início
  const startDateTime = new Date(`${format(data.date, 'yyyy-MM-dd')}T${data.startTime}`);
  const endDateTime = new Date(`${format(data.date, 'yyyy-MM-dd')}T${data.endTime}`);
  return endDateTime > startDateTime;
}, {
  message: "O horário de término deve ser posterior ao horário de início.",
  path: ["endTime"],
});

type SessionFormValues = z.infer<typeof sessionFormSchema>;

type SessionFormProps = {
  defaultValues?: Partial<SessionFormValues>;
  sessionId?: number;
  onSuccess: () => void;
};

export function SessionForm({ defaultValues, sessionId, onSuccess }: SessionFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  // Fetch leads for student selection
  const { data: leads = [] } = useQuery({
    queryKey: ['/api/leads'],
    queryFn: () => fetch('/api/leads').then(res => res.json())
  });

  // Fetch trainers for trainer selection
  const { data: trainers = [] } = useQuery({
    queryKey: ['/api/trainers'],
    queryFn: () => fetch('/api/trainers').then(res => res.json())
  });

  const form = useForm<SessionFormValues>({
    resolver: zodResolver(sessionFormSchema),
    defaultValues: {
      date: defaultValues?.date || new Date(),
      startTime: defaultValues?.startTime || '09:00',
      endTime: defaultValues?.endTime || '10:00',
      location: defaultValues?.location || '',
      source: defaultValues?.source || 'Favale',
      leadId: defaultValues?.leadId || 0,
      trainerId: defaultValues?.trainerId || 0,
      notes: defaultValues?.notes || '',
    },
  });

  const watchedSource = form.watch('source');

  // Filter students based on selected source
  const getFilteredStudents = () => {
    if (!watchedSource) return leads;
    
    // For this implementation, we'll show all leads regardless of source
    // In a real implementation, you might filter based on a source field in the leads
    return leads;
  };

  const onSubmit = async (values: SessionFormValues) => {
    setIsLoading(true);
    try {
      const sessionData = {
        startTime: new Date(`${format(values.date, 'yyyy-MM-dd')}T${values.startTime}`).toISOString(),
        endTime: new Date(`${format(values.date, 'yyyy-MM-dd')}T${values.endTime}`).toISOString(),
        location: values.location,
        source: values.source,
        leadId: values.leadId,
        trainerId: values.trainerId,
        notes: values.notes,
        status: 'scheduled'
      };

      if (sessionId) {
        // Update existing session
        const response = await fetch(`/api/sessions/${sessionId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(sessionData),
        });
        
        if (!response.ok) {
          throw new Error('Erro ao atualizar sessão');
        }
        
        toast({
          title: 'Sessão atualizada',
          description: 'A sessão foi atualizada com sucesso.',
        });
      } else {
        // Create new session
        const response = await fetch('/api/sessions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(sessionData),
        });
        
        if (!response.ok) {
          throw new Error('Erro ao criar sessão');
        }
        
        toast({
          title: 'Sessão criada',
          description: 'A sessão foi agendada com sucesso.',
        });
      }

      onSuccess();
    } catch (error) {
      console.error('Erro ao salvar sessão:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível salvar a sessão. Tente novamente.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Data */}
          <FormField
            control={form.control}
            name="date"
            render={({ field }) => (
              <FormItem className="flex flex-col">
                <FormLabel>Data da Sessão</FormLabel>
                <Popover>
                  <PopoverTrigger asChild>
                    <FormControl>
                      <Button
                        variant={"outline"}
                        className={cn(
                          "w-full pl-3 text-left font-normal",
                          !field.value && "text-muted-foreground"
                        )}
                      >
                        {field.value ? (
                          format(field.value, "PPP", { locale: ptBR })
                        ) : (
                          <span>Selecione uma data</span>
                        )}
                        <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                      </Button>
                    </FormControl>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={field.value}
                      onSelect={field.onChange}
                      disabled={(date) =>
                        date < new Date(new Date().setHours(0, 0, 0, 0))
                      }
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Origem */}
          <FormField
            control={form.control}
            name="source"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Origem</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione a origem" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="Favale">Favale</SelectItem>
                    <SelectItem value="Pink">Pink</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Horário de Início */}
          <FormField
            control={form.control}
            name="startTime"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Horário de Início</FormLabel>
                <FormControl>
                  <Input type="time" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Horário de Término */}
          <FormField
            control={form.control}
            name="endTime"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Horário de Término</FormLabel>
                <FormControl>
                  <Input type="time" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* Aluno */}
        <FormField
          control={form.control}
          name="leadId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Aluno</FormLabel>
              <Select onValueChange={(value) => field.onChange(parseInt(value))} value={field.value?.toString()}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione um aluno" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {getFilteredStudents().map((student: any) => (
                    <SelectItem key={student.id} value={student.id.toString()}>
                      {student.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Professor */}
        <FormField
          control={form.control}
          name="trainerId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Professor</FormLabel>
              <Select onValueChange={(value) => field.onChange(parseInt(value))} value={field.value?.toString()}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione um professor" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {trainers.map((trainer: any) => (
                    <SelectItem key={trainer.id} value={trainer.id.toString()}>
                      {trainer.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Local */}
        <FormField
          control={form.control}
          name="location"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Local</FormLabel>
              <FormControl>
                <Input placeholder="Ex: Academia Favale" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Observações */}
        <FormField
          control={form.control}
          name="notes"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Observações (Opcional)</FormLabel>
              <FormControl>
                <Textarea placeholder="Adicione observações sobre a sessão..." {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex gap-3 pt-4">
          <Button type="submit" disabled={isLoading} className="flex-1">
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {sessionId ? 'Atualizar Sessão' : 'Agendar Sessão'}
          </Button>
        </div>
      </form>
    </Form>
  );
}