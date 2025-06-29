import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { CalendarIcon, Clock, MapPin, User, DollarSign, Repeat, Calendar } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';

// Schema para o formulário
const sessionFormSchema = z.object({
  leadId: z.number().min(1, 'Selecione um aluno'),
  trainerId: z.number().min(1, 'Selecione um professor'),
  date: z.date({ required_error: 'Selecione uma data' }),
  startTime: z.string().min(1, 'Horário de início é obrigatório'),
  endTime: z.string().min(1, 'Horário de fim é obrigatório'),
  location: z.string().min(1, 'Local é obrigatório'),
  source: z.enum(['Favale', 'Pink', 'FavalePink'], {
    required_error: 'Selecione uma origem'
  }),
  value: z.number().min(1, 'Valor deve ser maior que zero'),
  service: z.string().min(1, 'Tipo de serviço é obrigatório'),
  notes: z.string().optional(),
  // Campos de recorrência
  recurrenceType: z.enum(['none', 'daily', 'weekly', 'monthly', 'yearly', 'custom']).default('none'),
  recurrenceInterval: z.number().min(1).default(1),
  recurrenceWeekDays: z.array(z.enum(['segunda', 'terca', 'quarta', 'quinta', 'sexta', 'sabado', 'domingo'])).optional(),
  recurrenceEndType: z.enum(['never', 'date', 'count']).default('never'),
  recurrenceEndDate: z.date().optional(),
  recurrenceEndCount: z.number().min(1).optional(),
}).refine(data => {
  // Validar horários
  const start = new Date(`2000-01-01T${data.startTime}`);
  const end = new Date(`2000-01-01T${data.endTime}`);
  return end > start;
}, {
  message: 'Horário de fim deve ser posterior ao horário de início',
  path: ['endTime']
}).refine(data => {
  // Validar campos de recorrência
  if (data.recurrenceType === 'weekly' && (!data.recurrenceWeekDays || data.recurrenceWeekDays.length === 0)) {
    return false;
  }
  if (data.recurrenceEndType === 'date' && !data.recurrenceEndDate) {
    return false;
  }
  if (data.recurrenceEndType === 'count' && !data.recurrenceEndCount) {
    return false;
  }
  return true;
}, {
  message: 'Configure corretamente as opções de recorrência',
  path: ['recurrenceType']
});

type SessionFormData = z.infer<typeof sessionFormSchema>;

interface NewSessionFormProps {
  leads: Array<{ id: number; name: string; source: string; status: string }>;
  trainers: Array<{ id: number; name: string; source: string }>;
  onSubmit: (data: SessionFormData) => void;
  onCancel: () => void;
  isLoading?: boolean;
}

export function NewSessionForm({ leads, trainers, onSubmit, onCancel, isLoading }: NewSessionFormProps) {
  const [showRecurrence, setShowRecurrence] = useState(false);
  const { toast } = useToast();

  const form = useForm<SessionFormData>({
    resolver: zodResolver(sessionFormSchema),
    defaultValues: {
      date: new Date(),
      startTime: '09:00',
      endTime: '10:00',
      value: 8000, // R$ 80,00 em centavos
      service: 'Personal Training',
      recurrenceType: 'none',
      recurrenceInterval: 1,
      recurrenceEndType: 'never',
    },
  });

  const watchRecurrenceType = form.watch('recurrenceType');
  const watchRecurrenceEndType = form.watch('recurrenceEndType');
  const watchSource = form.watch('source');

  // Filtrar alunos por origem
  const filteredLeads = leads.filter(lead => 
    lead.status === 'Aluno' && 
    (watchSource ? lead.source === watchSource : true)
  );

  // Filtrar professores por origem
  const filteredTrainers = trainers.filter(trainer => 
    watchSource ? trainer.source === watchSource || trainer.source === 'FavalePink' : true
  );

  const recurrenceOptions = [
    { value: 'none', label: 'Não se repete' },
    { value: 'daily', label: 'Todos os dias' },
    { value: 'weekly', label: 'Semanal' },
    { value: 'monthly', label: 'Mensal' },
    { value: 'yearly', label: 'Anual' },
    { value: 'custom', label: 'Personalizar...' }
  ];

  const weekDaysOptions = [
    { value: 'segunda', label: 'Segunda-feira' },
    { value: 'terca', label: 'Terça-feira' },
    { value: 'quarta', label: 'Quarta-feira' },
    { value: 'quinta', label: 'Quinta-feira' },
    { value: 'sexta', label: 'Sexta-feira' },
    { value: 'sabado', label: 'Sábado' },
    { value: 'domingo', label: 'Domingo' }
  ];

  const handleSubmit = (data: SessionFormData) => {
    try {
      onSubmit(data);
    } catch (error) {
      toast({
        title: 'Erro',
        description: 'Erro ao agendar sessão. Tente novamente.',
        variant: 'destructive'
      });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Calendar className="h-5 w-5 text-blue-500" />
        <h2 className="text-xl font-semibold">Agendar Nova Sessão</h2>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
          {/* Informações básicas */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Informações Básicas</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                          <SelectItem value="FavalePink">Favale&Pink</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="leadId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Aluno</FormLabel>
                      <Select 
                        onValueChange={(value) => field.onChange(parseInt(value))} 
                        value={field.value?.toString()}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione um aluno" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {filteredLeads.map((lead) => (
                            <SelectItem key={lead.id} value={lead.id.toString()}>
                              <div className="flex items-center gap-2">
                                <User className="h-4 w-4" />
                                {lead.name}
                                <Badge variant="outline" className="text-xs">
                                  {lead.source}
                                </Badge>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="trainerId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Professor</FormLabel>
                      <Select 
                        onValueChange={(value) => field.onChange(parseInt(value))} 
                        value={field.value?.toString()}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione um professor" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {filteredTrainers.map((trainer) => (
                            <SelectItem key={trainer.id} value={trainer.id.toString()}>
                              <div className="flex items-center gap-2">
                                <User className="h-4 w-4" />
                                {trainer.name}
                                <Badge variant="outline" className="text-xs">
                                  {trainer.source}
                                </Badge>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="location"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Local</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <MapPin className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                          <Input {...field} placeholder="Ex: Casa do aluno, Studio..." className="pl-10" />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="service"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tipo de Serviço</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione o serviço" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="Personal Training">Personal Training</SelectItem>
                          <SelectItem value="Treino Funcional">Treino Funcional</SelectItem>
                          <SelectItem value="Musculação">Musculação</SelectItem>
                          <SelectItem value="Pilates">Pilates</SelectItem>
                          <SelectItem value="Yoga">Yoga</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="value"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Valor (R$)</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <DollarSign className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                          <Input 
                            {...field}
                            type="number"
                            step="0.01"
                            placeholder="80.00"
                            className="pl-10"
                            onChange={(e) => field.onChange(Math.round(parseFloat(e.target.value || '0') * 100))}
                            value={field.value ? (field.value / 100).toFixed(2) : ''}
                          />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </CardContent>
          </Card>

          {/* Data e horário */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Data e Horário</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name="date"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Data</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant="outline"
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
                          <CalendarComponent
                            mode="single"
                            selected={field.value}
                            onSelect={field.onChange}
                            disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="startTime"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Horário de Início</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Clock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                          <Input {...field} type="time" className="pl-10" />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="endTime"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Horário de Fim</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Clock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                          <Input {...field} type="time" className="pl-10" />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </CardContent>
          </Card>

          {/* Recorrência */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Repeat className="h-4 w-4" />
                Repetir Sessão
              </CardTitle>
              <CardDescription>
                Configure se esta sessão deve se repetir automaticamente
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="recurrenceType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tipo de Repetição</FormLabel>
                    <Select onValueChange={(value) => {
                      field.onChange(value);
                      setShowRecurrence(value !== 'none');
                    }} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione como repetir" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {recurrenceOptions.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {showRecurrence && watchRecurrenceType !== 'none' && (
                <div className="space-y-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  {watchRecurrenceType === 'custom' && (
                    <div className="space-y-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                      <h4 className="font-medium text-blue-900 dark:text-blue-100">Recorrência personalizada</h4>

                      <div className="flex items-center gap-2">
                        <span className="text-sm text-gray-600 dark:text-gray-300">Repetir a cada:</span>
                        <FormField
                          control={form.control}
                          name="recurrenceInterval"
                          render={({ field }) => (
                            <FormItem className="flex-shrink-0">
                              <FormControl>
                                <Input
                                  {...field}
                                  type="number"
                                  min="1"
                                  max="30"
                                  className="w-16 text-center"
                                  onChange={(e) => field.onChange(parseInt(e.target.value || '1'))}
                                />
                              </FormControl>
                            </FormItem>
                          )}
                        />
                        <Select defaultValue="weekly">
                          <SelectTrigger className="w-32">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="daily">dia(s)</SelectItem>
                            <SelectItem value="weekly">semana(s)</SelectItem>
                            <SelectItem value="monthly">mês(es)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">Repetir:</Label>
                        <FormField
                          control={form.control}
                          name="recurrenceWeekDays"
                          render={({ field }) => (
                            <FormItem>
                              <div className="flex gap-1 mt-2">
                                {['D', 'S', 'T', 'Q', 'Q', 'S', 'S'].map((day, index) => {
                                  const dayValues = ['domingo', 'segunda', 'terca', 'quarta', 'quinta', 'sexta', 'sabado'];
                                  const dayValue = dayValues[index];
                                  const isSelected = field.value?.includes(dayValue as any) || false;

                                  return (
                                    <button
                                      key={index}
                                      type="button"
                                      onClick={() => {
                                        const current = field.value || [];
                                        if (isSelected) {
                                          field.onChange(current.filter(d => d !== dayValue));
                                        } else {
                                          field.onChange([...current, dayValue]);
                                        }
                                      }}
                                      className={cn(
                                        "w-8 h-8 rounded-full text-sm font-medium transition-colors",
                                        isSelected 
                                          ? "bg-blue-500 text-white" 
                                          : "bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
                                      )}
                                    >
                                      {day}
                                    </button>
                                  );
                                })}
                              </div>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      <div>
                        <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">Termina em</Label>
                        <FormField
                          control={form.control}
                          name="recurrenceEndType"
                          render={({ field }) => (
                            <FormItem className="mt-2">
                              <div className="space-y-2">
                                <div className="flex items-center space-x-2">
                                  <input
                                    type="radio"
                                    id="never"
                                    name="endType"
                                    checked={field.value === 'never'}
                                    onChange={() => field.onChange('never')}
                                    className="w-4 h-4 text-blue-600"
                                  />
                                  <Label htmlFor="never" className="text-sm">Nunca</Label>
                                </div>

                                <div className="flex items-center space-x-2">
                                  <input
                                    type="radio"
                                    id="date"
                                    name="endType"
                                    checked={field.value === 'date'}
                                    onChange={() => field.onChange('date')}
                                    className="w-4 h-4 text-blue-600"
                                  />
                                  <Label htmlFor="date" className="text-sm">Em</Label>
                                  {watchRecurrenceEndType === 'date' && (
                                    <FormField
                                      control={form.control}
                                      name="recurrenceEndDate"
                                      render={({ field: dateField }) => (
                                        <FormItem>
                                          <FormControl>
                                            <Input
                                              type="date"
                                              value={dateField.value ? format(dateField.value, 'yyyy-MM-dd') : ''}
                                              onChange={(e) => dateField.onChange(new Date(e.target.value))}
                                              className="text-sm"
                                            />
                                          </FormControl>
                                        </FormItem>
                                      )}
                                    />
                                  )}
                                </div>

                                <div className="flex items-center space-x-2">
                                  <input
                                    type="radio"
                                    id="count"
                                    name="endType"
                                    checked={field.value === 'count'}
                                    onChange={() => field.onChange('count')}
                                    className="w-4 h-4 text-blue-600"
                                  />
                                  <Label htmlFor="count" className="text-sm">Após</Label>
                                  {watchRecurrenceEndType === 'count' && (
                                    <FormField
                                      control={form.control}
                                      name="recurrenceEndCount"
                                      render={({ field: countField }) => (
                                        <FormItem>
                                          <FormControl>
                                            <Input
                                              {...countField}
                                              type="number"
                                              min="1"
                                              max="100"
                                              className="w-16 text-center text-sm"
                                              onChange={(e) => countField.onChange(parseInt(e.target.value || '1'))}
                                            />
                                          </FormControl>
                                        </FormItem>
                                      )}
                                    />
                                  )}
                                  {watchRecurrenceEndType === 'count' && (
                                    <span className="text-sm text-gray-600 dark:text-gray-400">ocorrências</span>
                                  )}
                                </div>
                              </div>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    </div>
                  )}

                  {(watchRecurrenceType === 'daily' || watchRecurrenceType === 'weekly' || watchRecurrenceType === 'monthly') && watchRecurrenceType !== 'custom' && (
                    <FormField
                      control={form.control}
                      name="recurrenceInterval"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>
                            {watchRecurrenceType === 'daily' && 'Repetir a cada X dias'}
                            {watchRecurrenceType === 'weekly' && 'Repetir a cada X semanas'}
                            {watchRecurrenceType === 'monthly' && 'Repetir a cada X meses'}
                          </FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              type="number"
                              min="1"
                              max="30"
                              onChange={(e) => field.onChange(parseInt(e.target.value || '1'))}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}

                  {watchRecurrenceType === 'weekly' && watchRecurrenceType !== 'custom' && (
                    <FormField
                      control={form.control}
                      name="recurrenceWeekDays"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Dias da Semana</FormLabel>
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                            {weekDaysOptions.map((day) => (
                              <div key={day.value} className="flex items-center space-x-2">
                                <Checkbox
                                  id={day.value}
                                  checked={field.value?.includes(day.value as any) || false}
                                  onCheckedChange={(checked) => {
                                    const current = field.value || [];
                                    if (checked) {
                                      field.onChange([...current, day.value]);
                                    } else {
                                      field.onChange(current.filter(d => d !== day.value));
                                    }
                                  }}
                                />
                                <Label htmlFor={day.value} className="text-sm">
                                  {day.label}
                                </Label>
                              </div>
                            ))}
                          </div>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}

                  <Separator />

                  <FormField
                    control={form.control}
                    name="recurrenceEndType"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Terminar</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Quando parar de repetir" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="never">Nunca</SelectItem>
                            <SelectItem value="date">Em uma data específica</SelectItem>
                            <SelectItem value="count">Após um número de ocorrências</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {watchRecurrenceEndType === 'date' && (
                    <FormField
                      control={form.control}
                      name="recurrenceEndDate"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Data Final</FormLabel>
                          <Popover>
                            <PopoverTrigger asChild>
                              <FormControl>
                                <Button
                                  variant="outline"
                                  className={cn(
                                    "w-full pl-3 text-left font-normal",
                                    !field.value && "text-muted-foreground"
                                  )}
                                >
                                  {field.value ? (
                                    format(field.value, "PPP", { locale: ptBR })
                                  ) : (
                                    <span>Selecione a data final</span>
                                  )}
                                  <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                </Button>
                              </FormControl>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                              <CalendarComponent
                                mode="single"
                                selected={field.value}
                                onSelect={field.onChange}
                                disabled={(date) => date < new Date()}
                                initialFocus
                              />
                            </PopoverContent>
                          </Popover>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}

                  {watchRecurrenceEndType === 'count' && (
                    <FormField
                      control={form.control}
                      name="recurrenceEndCount"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Número de Ocorrências</FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              type="number"
                              min="1"
                              max="100"
                              placeholder="Ex: 10"
                              onChange={(e) => field.onChange(parseInt(e.target.value || '1'))}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Observações */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Observações</CardTitle>
            </CardHeader>
            <CardContent>
              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Notas (opcional)</FormLabel>
                    <FormControl>
                      <Textarea
                        {...field}
                        placeholder="Observações sobre a sessão..."
                        className="min-h-[80px]"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          {/* Ações */}
          <div className="flex gap-3 justify-end">
            <Button type="button" variant="outline" onClick={onCancel}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? 'Agendando...' : 'Agendar Sessão'}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}