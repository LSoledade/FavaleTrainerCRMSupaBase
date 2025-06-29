import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { z } from "zod";
import { Calendar, Clock, User, MapPin, DollarSign, FileText, AlertCircle } from "lucide-react";
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
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import type { IAula, IProfessor } from "@/types";

// Form validation schema
const aulaFormSchema = z.object({
  startTime: z.string().min(1, "Horário de início é obrigatório"),
  endTime: z.string().min(1, "Horário de término é obrigatório"),
  location: z.string().min(1, "Local é obrigatório"),
  value: z.number().min(1, "Valor deve ser maior que zero"),
  service: z.string().min(1, "Serviço é obrigatório"),
  notes: z.string().optional(),
  status: z.enum(["agendado", "em_andamento", "concluido", "cancelado", "remarcado"]),
});

type AulaFormData = z.infer<typeof aulaFormSchema>;

interface AppointmentDialogProps {
  aula?: IAula | null;
  open: boolean;
  onClose: () => void;
}

export function AppointmentDialog({ aula, open, onClose }: AppointmentDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm<AulaFormData>({
    resolver: zodResolver(aulaFormSchema),
    defaultValues: {
      startTime: "",
      endTime: "",
      location: "",
      value: 0,
      service: "",
      notes: "",
      status: "agendado",
    },
  });

  // Fetch professors for display
  const { data: professors = [] } = useQuery({
    queryKey: ["/api/users/professors"],
    select: (data) => data as IProfessor[]
  });

  // Fetch leads for display
  const { data: leads = [] } = useQuery({
    queryKey: ["/api/leads"],
    select: (data: any) => data as any[]
  });

  // Reset form when aula changes
  useEffect(() => {
    if (aula && open) {
      const startTime = new Date(aula.startTime);
      const endTime = new Date(aula.endTime);
      
      form.reset({
        startTime: startTime.toISOString().slice(0, 16), // Format for datetime-local input
        endTime: endTime.toISOString().slice(0, 16),
        location: aula.location,
        value: aula.value / 100, // Convert from cents to reais
        service: aula.service,
        notes: aula.notes || "",
        status: aula.status,
      });
    }
  }, [aula, open, form]);

  // Update aula mutation
  const updateAulaMutation = useMutation({
    mutationFn: async (data: AulaFormData) => {
      const response = await fetch(`/api/new-scheduling/classes/${aula!.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          startTime: new Date(data.startTime).toISOString(),
          endTime: new Date(data.endTime).toISOString(),
          location: data.location,
          value: Math.round(data.value * 100), // Convert to cents
          service: data.service,
          notes: data.notes,
          status: data.status,
        }),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Erro ao atualizar aula");
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/new-scheduling/classes"] });
      toast({
        title: "Aula atualizada",
        description: "Aula atualizada com sucesso",
      });
      onClose();
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao atualizar aula",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: AulaFormData) => {
    updateAulaMutation.mutate(data);
  };

  if (!aula) return null;

  const professor = professors.find(p => p.id === aula.professorId);
  const student = leads.find(l => l.id === aula.studentId);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'agendado': return 'bg-blue-500';
      case 'em_andamento': return 'bg-amber-500';
      case 'concluido': return 'bg-green-500';
      case 'cancelado': return 'bg-red-500';
      case 'remarcado': return 'bg-purple-500';
      default: return 'bg-gray-500';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'agendado': return 'Agendado';
      case 'em_andamento': return 'Em Andamento';
      case 'concluido': return 'Concluído';
      case 'cancelado': return 'Cancelado';
      case 'remarcado': return 'Remarcado';
      default: return status;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Detalhes da Aula
            <Badge className={`ml-2 ${getStatusColor(aula.status)} text-white`}>
              {getStatusLabel(aula.status)}
            </Badge>
          </DialogTitle>
        </DialogHeader>

        {/* Basic Information Display */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-muted/30 rounded-lg">
          <div className="flex items-center gap-2">
            <User className="h-4 w-4 text-muted-foreground" />
            <div>
              <p className="text-sm font-medium">Professor</p>
              <p className="text-sm text-muted-foreground">
                {professor?.name || professor?.username || "Não encontrado"}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <User className="h-4 w-4 text-muted-foreground" />
            <div>
              <p className="text-sm font-medium">Aluno</p>
              <p className="text-sm text-muted-foreground">
                {student?.name || "Não encontrado"}
              </p>
            </div>
          </div>
        </div>

        {/* Conflict Warning */}
        {aula.isModified && (
          <div className="flex items-center gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg">
            <AlertCircle className="h-4 w-4 text-amber-600" />
            <div className="text-sm">
              <p className="font-medium text-amber-800">Aula Modificada</p>
              <p className="text-amber-700">
                Esta aula foi alterada em relação ao agendamento original.
              </p>
            </div>
          </div>
        )}

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Date and Time */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="startTime"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-2">
                      <Clock className="h-4 w-4" />
                      Horário de Início
                    </FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        type="datetime-local"
                      />
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
                      Horário de Término
                    </FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        type="datetime-local"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Location and Service */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                      <Input {...field} placeholder="Digite o local da aula" />
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
                    <FormLabel>Serviço</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Digite o tipo de serviço" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Value and Status */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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

              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Status</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione o status" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="agendado">Agendado</SelectItem>
                        <SelectItem value="em_andamento">Em Andamento</SelectItem>
                        <SelectItem value="concluido">Concluído</SelectItem>
                        <SelectItem value="cancelado">Cancelado</SelectItem>
                        <SelectItem value="remarcado">Remarcado</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Notes */}
            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    Observações
                  </FormLabel>
                  <FormControl>
                    <Textarea
                      {...field}
                      placeholder="Digite observações sobre a aula..."
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
                disabled={updateAulaMutation.isPending}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={updateAulaMutation.isPending}>
                {updateAulaMutation.isPending ? "Salvando..." : "Salvar Alterações"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}