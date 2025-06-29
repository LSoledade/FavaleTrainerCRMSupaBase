import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Calendar } from "@/components/ui/calendar";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { format, addDays, differenceInDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CalendarIcon, Clock, Users, DollarSign, MapPin } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

// Schema for the appointment form
const appointmentSchema = z.object({
  professorId: z.number().min(1, "Selecione um professor"),
  studentId: z.number().min(1, "Selecione um aluno"),
  startTime: z.string().min(1, "Horário é obrigatório"),
  endTime: z.string().min(1, "Horário de fim é obrigatório"),
  location: z.string().min(1, "Local é obrigatório"),
  value: z.number().min(0, "Valor deve ser positivo"),
  service: z.string().min(1, "Serviço é obrigatório"),
  notes: z.string().optional(),
  isRecurring: z.boolean().default(false),
  recurrenceType: z.enum(["weekly", "daily"]).optional(),
  recurrenceInterval: z.number().min(1).default(1).optional(),
});

type AppointmentFormData = z.infer<typeof appointmentSchema>;

interface MultiDateAppointmentDialogProps {
  isOpen: boolean;
  onClose: () => void;
  selectedDate?: Date;
  onSuccess: () => void;
}

export default function MultiDateAppointmentDialog({
  isOpen,
  onClose,
  selectedDate,
  onSuccess,
}: MultiDateAppointmentDialogProps) {
  const [selectedDates, setSelectedDates] = useState<Date[]>([]);
  const [showRecurrenceOptions, setShowRecurrenceOptions] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch professors
  const { data: professors = [] } = useQuery({
    queryKey: ["/api/users/professors"],
    enabled: isOpen,
  });

  // Fetch leads/students
  const { data: leads = [] } = useQuery({
    queryKey: ["/api/leads"],
    enabled: isOpen,
  });

  // Filter only students from leads
  const students = Array.isArray(leads) ? leads.filter((lead: any) => lead.status === "Aluno") : [];

  const form = useForm<AppointmentFormData>({
    resolver: zodResolver(appointmentSchema),
    defaultValues: {
      professorId: 0,
      studentId: 0,
      startTime: "09:00",
      endTime: "10:00",
      location: "",
      value: 0,
      service: "",
      notes: "",
      isRecurring: false,
      recurrenceType: "weekly",
      recurrenceInterval: 1,
    },
  });

  // Create appointment mutation
  const createAppointmentMutation = useMutation({
    mutationFn: async (data: any) => {
      if (selectedDates.length === 1 || !data.isRecurring) {
        // Single appointment
        const appointmentData = {
          ...data,
          startTime: `${format(selectedDates[0], "yyyy-MM-dd")} ${data.startTime}:00`,
          endTime: `${format(selectedDates[0], "yyyy-MM-dd")} ${data.endTime}:00`,
        };
        return fetch("/api/appointments", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(appointmentData),
        }).then(res => res.json());
      } else {
        // Multiple appointments or recurring
        const appointments = selectedDates.map(date => ({
          ...data,
          startTime: `${format(date, "yyyy-MM-dd")} ${data.startTime}:00`,
          endTime: `${format(date, "yyyy-MM-dd")} ${data.endTime}:00`,
        }));

        // Create batch appointments
        return Promise.all(
          appointments.map(appointment =>
            fetch("/api/appointments", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(appointment),
            }).then(res => res.json())
          )
        );
      }
    },
    onSuccess: () => {
      toast({
        title: "Sucesso!",
        description: `${selectedDates.length > 1 ? 'Agendamentos criados' : 'Agendamento criado'} com sucesso.`,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/appointments"] });
      queryClient.invalidateQueries({ queryKey: ["/api/aulas"] });
      onSuccess();
      handleClose();
    },
    onError: (error: any) => {
      console.error("Erro ao criar agendamento:", error);
      toast({
        title: "Erro",
        description: "Falha ao criar agendamento. Tente novamente.",
        variant: "destructive",
      });
    },
  });

  // Initialize with selected date
  useEffect(() => {
    if (selectedDate && isOpen) {
      setSelectedDates([selectedDate]);
      setShowRecurrenceOptions(false);
    }
  }, [selectedDate, isOpen]);

  // Check if should show recurrence options
  useEffect(() => {
    if (selectedDates.length > 1) {
      setShowRecurrenceOptions(true);
      form.setValue("isRecurring", true);
    } else {
      setShowRecurrenceOptions(false);
      form.setValue("isRecurring", false);
    }
  }, [selectedDates, form]);

  const handleClose = () => {
    form.reset();
    setSelectedDates([]);
    setShowRecurrenceOptions(false);
    onClose();
  };

  const handleDateSelect = (date: Date | undefined) => {
    if (!date) return;

    setSelectedDates(prev => {
      const isAlreadySelected = prev.some(d => 
        format(d, "yyyy-MM-dd") === format(date, "yyyy-MM-dd")
      );

      if (isAlreadySelected) {
        // Remove date if already selected
        return prev.filter(d => 
          format(d, "yyyy-MM-dd") !== format(date, "yyyy-MM-dd")
        );
      } else {
        // Add date
        return [...prev, date].sort((a, b) => a.getTime() - b.getTime());
      }
    });
  };

  const onSubmit = (data: AppointmentFormData) => {
    if (selectedDates.length === 0) {
      toast({
        title: "Erro",
        description: "Selecione pelo menos uma data no calendário.",
        variant: "destructive",
      });
      return;
    }

    createAppointmentMutation.mutate(data);
  };

  const getRecurrenceDescription = () => {
    if (selectedDates.length <= 1) return "";
    
    const sortedDates = [...selectedDates].sort((a, b) => a.getTime() - b.getTime());
    const firstDate = sortedDates[0];
    const lastDate = sortedDates[sortedDates.length - 1];
    const daysDiff = differenceInDays(lastDate, firstDate);
    
    if (selectedDates.length === 2) {
      const interval = differenceInDays(sortedDates[1], sortedDates[0]);
      if (interval === 7) {
        return "Agendamento semanal";
      } else if (interval === 1) {
        return "Agendamento em dias consecutivos";
      } else {
        return `Agendamento com intervalo de ${interval} dias`;
      }
    }
    
    return `${selectedDates.length} agendamentos selecionados (${format(firstDate, "dd/MM", { locale: ptBR })} - ${format(lastDate, "dd/MM", { locale: ptBR })})`;
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CalendarIcon className="h-5 w-5" />
            Novo Agendamento
          </DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Calendar Section */}
          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-semibold mb-2">Selecione as Datas</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Clique nas datas desejadas. Para múltiplas datas, clique em cada uma.
              </p>
              <Calendar
                mode="multiple"
                selected={selectedDates}
                onSelect={(dates) => {
                  if (dates) {
                    setSelectedDates(Array.isArray(dates) ? dates : [dates]);
                  }
                }}
                className="rounded-md border"
                locale={ptBR}
                disabled={(date) => date < new Date()}
              />
            </div>

            {/* Selected Dates Display */}
            {selectedDates.length > 0 && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Datas Selecionadas</CardTitle>
                  {showRecurrenceOptions && (
                    <CardDescription>{getRecurrenceDescription()}</CardDescription>
                  )}
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {selectedDates.map((date, index) => (
                      <Badge key={index} variant="secondary" className="text-xs">
                        {format(date, "dd/MM/yyyy", { locale: ptBR })}
                        <button
                          onClick={() => handleDateSelect(date)}
                          className="ml-2 hover:text-destructive"
                        >
                          ×
                        </button>
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Form Section */}
          <div className="space-y-4">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                {/* Professor Selection */}
                <FormField
                  control={form.control}
                  name="professorId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-2">
                        <Users className="h-4 w-4" />
                        Professor
                      </FormLabel>
                      <Select onValueChange={(value) => field.onChange(Number(value))}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione um professor" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {Array.isArray(professors) ? professors.map((professor: any) => (
                            <SelectItem key={professor.id} value={professor.id.toString()}>
                              {professor.name} - {professor.specialty}
                            </SelectItem>
                          )) : []}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Student Selection */}
                <FormField
                  control={form.control}
                  name="studentId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-2">
                        <Users className="h-4 w-4" />
                        Aluno
                      </FormLabel>
                      <Select onValueChange={(value) => field.onChange(Number(value))}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione um aluno" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {students.map((student: any) => (
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

                {/* Time Selection */}
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="startTime"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center gap-2">
                          <Clock className="h-4 w-4" />
                          Início
                        </FormLabel>
                        <FormControl>
                          <Input type="time" {...field} />
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
                        <FormLabel>Fim</FormLabel>
                        <FormControl>
                          <Input type="time" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Location and Value */}
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="location"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center gap-2">
                          <MapPin className="h-4 w-4" />
                          Local
                        </FormLabel>
                        <FormControl>
                          <Input placeholder="Ex: Academia Favale" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="value"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center gap-2">
                          <DollarSign className="h-4 w-4" />
                          Valor (R$)
                        </FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            step="0.01"
                            min="0"
                            placeholder="0.00"
                            {...field}
                            onChange={(e) => field.onChange(Number(e.target.value))}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Service */}
                <FormField
                  control={form.control}
                  name="service"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Serviço</FormLabel>
                      <FormControl>
                        <Input placeholder="Ex: Personal Training" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Notes */}
                <FormField
                  control={form.control}
                  name="notes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Observações</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Observações adicionais..."
                          className="min-h-[80px]"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Separator />

                {/* Action Buttons */}
                <div className="flex justify-end gap-2 pt-4">
                  <Button type="button" variant="outline" onClick={handleClose}>
                    Cancelar
                  </Button>
                  <Button
                    type="submit"
                    disabled={createAppointmentMutation.isPending || selectedDates.length === 0}
                  >
                    {createAppointmentMutation.isPending ? "Criando..." : 
                      selectedDates.length > 1 ? `Criar ${selectedDates.length} Agendamentos` : "Criar Agendamento"
                    }
                  </Button>
                </div>
              </form>
            </Form>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}