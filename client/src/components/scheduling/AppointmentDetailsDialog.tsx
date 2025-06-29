import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import {
  Calendar,
  Clock,
  MapPin,
  DollarSign,
  User,
  Building,
  Phone,
  Mail,
  FileText,
  Trash2,
  Edit3,
  CheckCircle,
  XCircle,
  AlertTriangle,
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import type { IAula } from "@/types";

interface AppointmentDetailsDialogProps {
  isOpen: boolean;
  onClose: () => void;
  appointment: IAula | null;
  onEdit?: (appointment: IAula) => void;
}

const statusConfig = {
  agendado: { label: "Agendado", color: "bg-blue-500", icon: Calendar },
  em_andamento: { label: "Em Andamento", color: "bg-amber-500", icon: Clock },
  concluido: { label: "Concluído", color: "bg-green-500", icon: CheckCircle },
  cancelado: { label: "Cancelado", color: "bg-red-500", icon: XCircle },
  remarcado: { label: "Remarcado", color: "bg-purple-500", icon: AlertTriangle },
};

export default function AppointmentDetailsDialog({
  isOpen,
  onClose,
  appointment,
  onEdit,
}: AppointmentDetailsDialogProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const deleteAppointment = useMutation({
    mutationFn: async (id: number) => {
      const response = await fetch(`/api/appointments/${id}`, {
        method: "DELETE",
      });
      if (!response.ok) {
        throw new Error("Erro ao deletar agendamento");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/appointments"] });
      toast({
        title: "Agendamento deletado",
        description: "O agendamento foi removido com sucesso.",
      });
      onClose();
    },
    onError: (error) => {
      toast({
        title: "Erro ao deletar",
        description: "Não foi possível deletar o agendamento. Tente novamente.",
        variant: "destructive",
      });
    },
  });

  const handleDelete = async () => {
    if (!appointment) return;
    
    setIsDeleting(true);
    try {
      await deleteAppointment.mutateAsync(appointment.id);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleEdit = () => {
    if (appointment && onEdit) {
      onEdit(appointment);
      onClose();
    }
  };

  if (!appointment) return null;

  const status = statusConfig[appointment.status] || statusConfig.agendado;
  const StatusIcon = status.icon;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <StatusIcon className="h-6 w-6" />
            Detalhes do Agendamento
          </DialogTitle>
          <DialogDescription>
            Informações completas sobre este agendamento
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Status e Informações Básicas */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  {appointment.service || "Serviço"}
                </span>
                <Badge className={`${status.color} text-white`}>
                  {status.label}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-gray-500" />
                  <div>
                    <p className="font-medium">Data e Horário</p>
                    <p className="text-sm text-gray-600">
                      {format(new Date(appointment.startTime), "EEEE, dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                    </p>
                    <p className="text-sm text-gray-600">
                      {format(new Date(appointment.startTime), "HH:mm", { locale: ptBR })} - {format(new Date(appointment.endTime), "HH:mm", { locale: ptBR })}
                    </p>
                  </div>
                </div>

                {appointment.location && (
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-gray-500" />
                    <div>
                      <p className="font-medium">Local</p>
                      <p className="text-sm text-gray-600">{appointment.location}</p>
                    </div>
                  </div>
                )}

                {appointment.value && appointment.value > 0 && (
                  <div className="flex items-center gap-2">
                    <DollarSign className="h-4 w-4 text-gray-500" />
                    <div>
                      <p className="font-medium">Valor</p>
                      <p className="text-sm text-gray-600">
                        R$ {appointment.value.toFixed(2).replace('.', ',')}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Informações do Aluno */}
          {appointment.student && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Informações do Aluno
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <p className="font-medium text-lg">{appointment.student.name}</p>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {appointment.student.email && (
                    <div className="flex items-center gap-2">
                      <Mail className="h-4 w-4 text-gray-500" />
                      <span className="text-sm">{appointment.student.email}</span>
                    </div>
                  )}
                  {appointment.student.phone && (
                    <div className="flex items-center gap-2">
                      <Phone className="h-4 w-4 text-gray-500" />
                      <span className="text-sm">{appointment.student.phone}</span>
                    </div>
                  )}
                </div>

                {appointment.student.notes && (
                  <div>
                    <p className="font-medium text-sm mb-1">Observações do Aluno:</p>
                    <p className="text-sm text-gray-600 bg-gray-50 p-2 rounded">
                      {appointment.student.notes}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Informações do Professor */}
          {appointment.professor && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Informações do Professor
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <p className="font-medium text-lg">
                    {appointment.professor.name || appointment.professor.username}
                  </p>
                  {appointment.professor.specialty && (
                    <p className="text-sm text-gray-600">{appointment.professor.specialty}</p>
                  )}
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {appointment.professor.email && (
                    <div className="flex items-center gap-2">
                      <Mail className="h-4 w-4 text-gray-500" />
                      <span className="text-sm">{appointment.professor.email}</span>
                    </div>
                  )}
                  {appointment.professor.hourlyRate && (
                    <div className="flex items-center gap-2">
                      <DollarSign className="h-4 w-4 text-gray-500" />
                      <span className="text-sm">R$ {appointment.professor.hourlyRate}/hora</span>
                    </div>
                  )}
                </div>

                {appointment.professor.bio && (
                  <div>
                    <p className="font-medium text-sm mb-1">Sobre o Professor:</p>
                    <p className="text-sm text-gray-600 bg-gray-50 p-2 rounded">
                      {appointment.professor.bio}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Observações do Agendamento */}
          {appointment.notes && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Observações
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-600 bg-gray-50 p-3 rounded">
                  {appointment.notes}
                </p>
              </CardContent>
            </Card>
          )}
        </div>

        <Separator />

        <DialogFooter className="flex justify-between">
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={handleEdit}
              disabled={isDeleting}
            >
              <Edit3 className="h-4 w-4 mr-2" />
              Editar
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={isDeleting}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              {isDeleting ? "Deletando..." : "Deletar"}
            </Button>
          </div>
          <Button variant="outline" onClick={onClose}>
            Fechar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}