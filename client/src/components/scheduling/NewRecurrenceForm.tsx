import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { z } from "zod";
import { Plus, Calendar, Clock, User, MapPin, DollarSign, Repeat, X } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import type { IProfessor, INewRecurrenceForm, IRegraRecorrencia } from "@/types";

// Form validation schema
const recurrenceFormSchema = z.object({
  professorId: z.number().min(1, "Professor é obrigatório"),
  studentId: z.number().min(1, "Aluno é obrigatório"),
  location: z.string().min(1, "Local é obrigatório"),
  value: z.number().min(1, "Valor deve ser maior que zero"),
  service: z.string().min(1, "Serviço é obrigatório"),
  notes: z.string().optional(),
  startDate: z.string().min(1, "Data de início é obrigatória"),
  startTime: z.string().min(1, "Horário de início é obrigatório"),
  endTime: z.string().min(1, "Horário de término é obrigatório"),
  recurrence: z.object({
    type: z.enum(["daily", "weekly", "monthly", "yearly", "custom"]),
    interval: z.number().min(1, "Intervalo deve ser pelo menos 1"),
    weekDays: z.array(z.string()).optional(),
    monthDay: z.number().optional(),
    endType: z.enum(["never", "date", "count"]),
    endDate: z.string().optional(),
    endCount: z.number().optional(),
  }),
});

type RecurrenceFormData = z.infer<typeof recurrenceFormSchema>;

interface NewRecurrenceFormProps {
  open: boolean;
  onClose: () => void;
}

const weekDayOptions = [
  { value: "monday", label: "Segunda-feira" },
  { value: "tuesday", label: "Terça-feira" },
  { value: "wednesday", label: "Quarta-feira" },
  { value: "thursday", label: "Quinta-feira" },
  { value: "friday", label: "Sexta-feira" },
  { value: "saturday", label: "Sábado" },
  { value: "sunday", label: "Domingo" },
];

export function NewRecurrenceForm({ open, onClose }: NewRecurrenceFormProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm<RecurrenceFormData>({
    resolver: zodResolver(recurrenceFormSchema),
    defaultValues: {
      professorId: 0,
      studentId: 0,
      location: "",
      value: 0,
      service: "",
      notes: "",
      startDate: "",
      startTime: "09:00",
      endTime: "10:00",
      recurrence: {
        type: "weekly",
        interval: 1,
        weekDays: [],
        endType: "never",
      },
    },
  });

  // Fetch professors
  const { data: professors = [] } = useQuery({
    queryKey: ["/api/users/professors"],
    select: (data) => data as IProfessor[]
  });

  // Fetch leads (students)
  const { data: leads = [] } = useQuery({
    queryKey: ["/api/leads"],
    select: (data: any) => data as any[]
  });

  // Filter only students (leads with status "Aluno")
  const students = leads.filter((lead: any) => lead.status === "Aluno");

  // Create recurrence mutation
  const createRecurrenceMutation = useMutation({
    mutationFn: async (data: RecurrenceFormData) => {
      // Combine date and time for start and end
      const startDateTime = new Date(`${data.startDate}T${data.startTime}`);
      const endDateTime = new Date(`${data.startDate}T${data.endTime}`);

      const payload = {
        professorId: data.professorId,
        studentId: data.studentId,
        location: data.location,
        value: Math.round(data.value * 100), // Convert to cents
        service: data.service,
        notes: data.notes,
        regras: data.recurrence,
        startDate: startDateTime.toISOString(),
        endDate: data.recurrence.endType === "date" && data.recurrence.endDate
          ? new Date(data.recurrence.endDate).toISOString()
          : undefined,
        maxOccurrences: data.recurrence.endType === "count"
          ? data.recurrence.endCount
          : undefined,
        active: true,
      };

      const response = await fetch("/api/new-scheduling/recurrent", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Erro ao criar agendamento recorrente");
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/new-scheduling/classes"] });
      toast({
        title: "Agendamento recorrente criado",
        description: "Agendamento criado com sucesso. As aulas foram geradas automaticamente.",
      });
      onClose();
      form.reset();
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao criar agendamento",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: RecurrenceFormData) => {
    createRecurrenceMutation.mutate(data);
  };

  const recurrenceType = form.watch("recurrence.type");
  const recurrenceEndType = form.watch("recurrence.endType");

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Repeat className="h-5 w-5" />
            Novo Agendamento Recorrente
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Professor and Student */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="professorId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-2">
                      <User className="h-4 w-4" />
                      Professor *
                    </FormLabel>
                    <Select onValueChange={(value) => field.onChange(parseInt(value))}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione o professor" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {professors.map((professor) => (
                          <SelectItem key={professor.id} value={professor.id.toString()}>
                            {professor.name || professor.username}
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
                name="studentId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-2">
                      <User className="h-4 w-4" />
                      Aluno *
                    </FormLabel>
                    <Select onValueChange={(value) => field.onChange(parseInt(value))}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione o aluno" />
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
            </div>

            {/* Service and Location */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="service"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Serviço *</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Ex: Personal Training, Pilates..." />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="location"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-2">
                      <MapPin className="h-4 w-4" />
                      Local *
                    </FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Ex: Academia Pink, Domicílio..." />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Value */}
            <FormField
              control={form.control}
              name="value"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-2">
                    <DollarSign className="h-4 w-4" />
                    Valor por Aula (R$) *
                  </FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="0.00"
                      onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Date and Time */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <FormField
                control={form.control}
                name="startDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      Data de Início *
                    </FormLabel>
                    <FormControl>
                      <Input {...field} type="date" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="startTime"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-2">
                      <Clock className="h-4 w-4" />
                      Horário de Início *
                    </FormLabel>
                    <FormControl>
                      <Input {...field} type="time" />
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
                    <FormLabel className="flex items-center gap-2">
                      <Clock className="h-4 w-4" />
                      Horário de Término *
                    </FormLabel>
                    <FormControl>
                      <Input {...field} type="time" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Recurrence Settings */}
            <div className="border rounded-lg p-4 space-y-4">
              <h3 className="font-medium flex items-center gap-2">
                <Repeat className="h-4 w-4" />
                Configurações de Recorrência
              </h3>

              {/* Recurrence Type */}
              <FormField
                control={form.control}
                name="recurrence.type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tipo de Recorrência</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="daily">Diário</SelectItem>
                        <SelectItem value="weekly">Semanal</SelectItem>
                        <SelectItem value="monthly">Mensal</SelectItem>
                        <SelectItem value="yearly">Anual</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Interval */}
              <FormField
                control={form.control}
                name="recurrence.interval"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      {recurrenceType === "daily" && "A cada quantos dias"}
                      {recurrenceType === "weekly" && "A cada quantas semanas"}
                      {recurrenceType === "monthly" && "A cada quantos meses"}
                      {recurrenceType === "yearly" && "A cada quantos anos"}
                    </FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        type="number"
                        min="1"
                        onChange={(e) => field.onChange(parseInt(e.target.value) || 1)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Week Days (only for weekly) */}
              {recurrenceType === "weekly" && (
                <FormField
                  control={form.control}
                  name="recurrence.weekDays"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Dias da Semana</FormLabel>
                      <div className="grid grid-cols-2 gap-2">
                        {weekDayOptions.map((option) => (
                          <div key={option.value} className="flex items-center space-x-2">
                            <Checkbox
                              id={option.value}
                              checked={field.value?.includes(option.value)}
                              onCheckedChange={(checked) => {
                                const current = field.value || [];
                                if (checked) {
                                  field.onChange([...current, option.value]);
                                } else {
                                  field.onChange(current.filter((day) => day !== option.value));
                                }
                              }}
                            />
                            <label htmlFor={option.value} className="text-sm">
                              {option.label}
                            </label>
                          </div>
                        ))}
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              {/* End Type */}
              <FormField
                control={form.control}
                name="recurrence.endType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Fim da Recorrência</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="never">Nunca termina</SelectItem>
                        <SelectItem value="date">Até uma data específica</SelectItem>
                        <SelectItem value="count">Após um número de ocorrências</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* End Date */}
              {recurrenceEndType === "date" && (
                <FormField
                  control={form.control}
                  name="recurrence.endDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Data de Término</FormLabel>
                      <FormControl>
                        <Input {...field} type="date" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              {/* End Count */}
              {recurrenceEndType === "count" && (
                <FormField
                  control={form.control}
                  name="recurrence.endCount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Número de Ocorrências</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          type="number"
                          min="1"
                          onChange={(e) => field.onChange(parseInt(e.target.value) || 1)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
            </div>

            {/* Notes */}
            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Observações</FormLabel>
                  <FormControl>
                    <Textarea
                      {...field}
                      placeholder="Digite observações sobre o agendamento..."
                      rows={3}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Buttons */}
            <div className="flex justify-end gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                disabled={createRecurrenceMutation.isPending}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={createRecurrenceMutation.isPending}>
                {createRecurrenceMutation.isPending ? "Criando..." : "Criar Agendamento"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}