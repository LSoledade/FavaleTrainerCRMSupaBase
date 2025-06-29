
import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Calendar, Clock, MapPin, User, MoreVertical, Trash2, Repeat, Filter, Search } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface IAula {
  id: number;
  service: string;
  startTime: string;
  endTime: string;
  location: string;
  source: 'Favale' | 'Pink' | 'FavalePink';
  notes?: string;
  status: string;
  leadId: number;
  trainerId: number;
  value?: number;
  recurrenceType?: string;
  recurrenceGroupId?: string;
  isRecurrenceParent?: boolean;
  parentSessionId?: number;
  lead?: {
    id: number;
    name: string;
    phone: string;
    email?: string;
  };
  trainer?: {
    id: number;
    name: string;
    email?: string;
  };
}

interface Professor {
  id: number;
  username: string;
  role: string;
}

interface Lead {
  id: number;
  name: string;
  phone: string;
  email?: string;
  tags?: string[];
}

interface RecurringGroup {
  id: string;
  sessions: IAula[];
  pattern: string;
  studentName: string;
  trainerName: string;
  source: 'Favale' | 'Pink' | 'FavalePink';
  location: string;
  timeSlot: string;
  nextSession?: IAula;
  status: string;
}

interface AppointmentsManagementProps {
  onRefresh: () => void;
}

const STATUS_LABELS = {
  SCHEDULED: { label: "Agendada", color: "bg-blue-500", textColor: "text-white" },
  DESM_DIA: { label: "Desmarcada no dia", color: "bg-red-500", textColor: "text-white" },
  DESM_ANTEC: { label: "Desmarcada com antecedência", color: "bg-orange-500", textColor: "text-white" },
  DESM_MANUF: { label: "Desmarcada pelo professor/academia", color: "bg-purple-500", textColor: "text-white" },
  REP: { label: "Reposição", color: "bg-yellow-500", textColor: "text-black" },
  REP_DESM_DIA: { label: "Reposição desmarcada no dia", color: "bg-red-700", textColor: "text-white" },
  AULA_ADIC: { label: "Aula adicional", color: "bg-green-500", textColor: "text-white" },
  COMPLETED: { label: "Realizada", color: "bg-emerald-500", textColor: "text-white" },
  CANCELLED: { label: "Cancelada definitivamente", color: "bg-gray-500", textColor: "text-white" },
  agendado: { label: "Agendada", color: "bg-blue-500", textColor: "text-white" },
  em_andamento: { label: "Em andamento", color: "bg-blue-600", textColor: "text-white" },
  concluido: { label: "Concluída", color: "bg-green-500", textColor: "text-white" },
  cancelado: { label: "Cancelada", color: "bg-red-500", textColor: "text-white" },
  remarcado: { label: "Remarcada", color: "bg-orange-500", textColor: "text-white" }
};

const AppointmentsManagement = ({ onRefresh }: AppointmentsManagementProps) => {
  const [filterProfessor, setFilterProfessor] = useState<string>("all");
  const [filterStudent, setFilterStudent] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [viewMode, setViewMode] = useState<"individual" | "grouped">("grouped");

  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch appointments
  const { data: appointments = [], isLoading, refetch } = useQuery<IAula[]>({
    queryKey: ['/api/appointments'],
  });

  // Fetch professors
  const { data: professors = [] } = useQuery<Professor[]>({
    queryKey: ['/api/users/professors'],
  });

  // Fetch students (leads with "Alunos" tag)
  const { data: allLeads = [] } = useQuery<Lead[]>({
    queryKey: ['/api/leads'],
  });

  const students = allLeads.filter(lead => 
    lead.tags?.includes("Alunos")
  );

  // Delete recurring group mutation
  const deleteRecurringGroupMutation = useMutation({
    mutationFn: async (groupId: string) => {
      const response = await fetch(`/api/appointments/recurring/${groupId}`, {
        method: 'DELETE',
      });
      if (!response.ok) {
        throw new Error('Erro ao excluir recorrência');
      }
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Sucesso",
        description: "Recorrência excluída com sucesso",
      });
      refetch();
      onRefresh();
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Erro ao excluir recorrência",
        variant: "destructive",
      });
    },
  });

  // Update appointment status mutation
  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: number; status: string }) => {
      const response = await fetch(`/api/appointments/${id}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status }),
      });
      if (!response.ok) {
        throw new Error('Erro ao atualizar status');
      }
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Sucesso",
        description: "Status atualizado com sucesso",
      });
      refetch();
      onRefresh();
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Erro ao atualizar status",
        variant: "destructive",
      });
    },
  });

  // Group appointments by recurrence
  const recurringGroups = useMemo(() => {
    const groups: { [key: string]: RecurringGroup } = {};
    
    appointments.forEach(appointment => {
      if (appointment.recurrenceGroupId) {
        const groupId = appointment.recurrenceGroupId;
        if (!groups[groupId]) {
          groups[groupId] = {
            id: groupId,
            sessions: [],
            pattern: appointment.recurrenceType || 'Recorrente',
            studentName: appointment.lead?.name || 'N/A',
            trainerName: appointment.trainer?.name || 'N/A',
            source: appointment.source,
            location: appointment.location,
            timeSlot: `${format(parseISO(appointment.startTime), 'HH:mm')} - ${format(parseISO(appointment.endTime), 'HH:mm')}`,
            status: appointment.status,
          };
        }
        groups[groupId].sessions.push(appointment);
        
        // Find next session
        const now = new Date();
        const futureSessions = groups[groupId].sessions
          .filter(s => parseISO(s.startTime) > now)
          .sort((a, b) => parseISO(a.startTime).getTime() - parseISO(b.startTime).getTime());
        
        if (futureSessions.length > 0) {
          groups[groupId].nextSession = futureSessions[0];
        }
      }
    });
    
    return Object.values(groups);
  }, [appointments]);

  // Filter appointments
  const filteredAppointments = useMemo(() => {
    return appointments.filter(appointment => {
      const matchesProfessor = !filterProfessor || filterProfessor === 'all' || appointment.trainerId.toString() === filterProfessor;
      const matchesStudent = !filterStudent || filterStudent === 'all' || appointment.leadId.toString() === filterStudent;
      const matchesStatus = !filterStatus || filterStatus === 'all' || appointment.status === filterStatus;
      const matchesSearch = !searchTerm || 
        appointment.lead?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        appointment.trainer?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        appointment.service.toLowerCase().includes(searchTerm.toLowerCase());
      
      return matchesProfessor && matchesStudent && matchesStatus && matchesSearch;
    });
  }, [appointments, filterProfessor, filterStudent, filterStatus, searchTerm]);

  // Filter recurring groups
  const filteredRecurringGroups = useMemo(() => {
    return recurringGroups.filter(group => {
      const matchesProfessor = !filterProfessor || filterProfessor === 'all' || group.sessions.some(s => s.trainerId.toString() === filterProfessor);
      const matchesStudent = !filterStudent || filterStudent === 'all' || group.sessions.some(s => s.leadId.toString() === filterStudent);
      const matchesStatus = !filterStatus || filterStatus === 'all' || group.status === filterStatus;
      const matchesSearch = !searchTerm || 
        group.studentName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        group.trainerName.toLowerCase().includes(searchTerm.toLowerCase());
      
      return matchesProfessor && matchesStudent && matchesStatus && matchesSearch;
    });
  }, [recurringGroups, filterProfessor, filterStudent, filterStatus, searchTerm]);

  const getSourceColor = (source: string) => {
    switch (source) {
      case 'Favale':
        return 'bg-blue-100 text-blue-800';
      case 'Pink':
        return 'bg-pink-100 text-pink-800';
      case 'FavalePink':
        return 'bg-purple-100 text-purple-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  // Statistics calculation
  const statistics = useMemo(() => {
    const total = appointments.length;
    const recurring = appointments.filter(a => a.recurrenceGroupId).length;
    const individual = total - recurring;
    const scheduled = appointments.filter(a => a.status === 'agendado' || a.status === 'SCHEDULED').length;
    const completed = appointments.filter(a => a.status === 'concluido' || a.status === 'COMPLETED').length;
    const cancelled = appointments.filter(a => a.status === 'cancelado' || a.status === 'CANCELLED').length;
    
    return { total, recurring, individual, scheduled, completed, cancelled };
  }, [appointments]);

  if (isLoading) {
    return <div>Carregando agendamentos...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Statistics */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900">{statistics.total}</div>
              <div className="text-sm text-gray-600">Total</div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{statistics.scheduled}</div>
              <div className="text-sm text-gray-600">Agendadas</div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{statistics.completed}</div>
              <div className="text-sm text-gray-600">Realizadas</div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-red-600">{statistics.cancelled}</div>
              <div className="text-sm text-gray-600">Canceladas</div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">{statistics.recurring}</div>
              <div className="text-sm text-gray-600">Recorrentes</div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">{statistics.individual}</div>
              <div className="text-sm text-gray-600">Individuais</div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filtros
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Buscar</label>
              <div className="relative">
                <Search className="h-4 w-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <Input
                  placeholder="Nome, professor, serviço..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium">Professor</label>
              <Select value={filterProfessor} onValueChange={setFilterProfessor}>
                <SelectTrigger>
                  <SelectValue placeholder="Todos os professores" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os professores</SelectItem>
                  {professors.map((professor) => (
                    <SelectItem key={professor.id} value={professor.id.toString()}>
                      {professor.username}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium">Aluno</label>
              <Select value={filterStudent} onValueChange={setFilterStudent}>
                <SelectTrigger>
                  <SelectValue placeholder="Todos os alunos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os alunos</SelectItem>
                  {students.map((student) => (
                    <SelectItem key={student.id} value={student.id.toString()}>
                      {student.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium">Status</label>
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger>
                  <SelectValue placeholder="Todos os status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os status</SelectItem>
                  {Object.entries(STATUS_LABELS).map(([key, value]) => (
                    <SelectItem key={key} value={key}>
                      {value.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium">Visualização</label>
              <Select value={viewMode} onValueChange={(value: "individual" | "grouped") => setViewMode(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="grouped">Agrupado por Recorrência</SelectItem>
                  <SelectItem value="individual">Individual</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Appointments List */}
      <div className="space-y-4">
        {viewMode === "grouped" ? (
          // Grouped view
          <>
            {filteredRecurringGroups.length > 0 && (
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Serviços Recorrentes</h3>
                {filteredRecurringGroups.map((group) => (
                  <Card key={group.id}>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <Repeat className="h-5 w-5 text-blue-500" />
                          <div>
                            <CardTitle className="text-lg">{group.pattern}</CardTitle>
                            <p className="text-sm text-gray-600">
                              {group.studentName} • {group.trainerName}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge className={getSourceColor(group.source)}>
                            {group.source}
                          </Badge>
                          <Badge className={`${STATUS_LABELS[group.status as keyof typeof STATUS_LABELS]?.color || "bg-gray-500"} ${STATUS_LABELS[group.status as keyof typeof STATUS_LABELS]?.textColor || "text-white"}`}>
                            {STATUS_LABELS[group.status as keyof typeof STATUS_LABELS]?.label || group.status}
                          </Badge>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="outline" size="sm">
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Excluir Recorrência</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Tem certeza que deseja excluir esta recorrência? Todas as aulas agendadas desta recorrência serão removidas. Esta ação não pode ser desfeita.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => deleteRecurringGroupMutation.mutate(group.id)}
                                  className="bg-red-500 hover:bg-red-600"
                                >
                                  Excluir
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm mb-4">
                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4 text-gray-500" />
                          <span>{group.timeSlot}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <MapPin className="h-4 w-4 text-gray-500" />
                          <span>{group.location}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-gray-500" />
                          <span>{group.sessions.length} aulas agendadas</span>
                        </div>
                      </div>
                      
                      {/* Status breakdown for this group */}
                      <div className="mb-4">
                        <p className="text-sm font-medium mb-2">Status das aulas:</p>
                        <div className="flex flex-wrap gap-2">
                          {Object.entries(
                            group.sessions.reduce((acc, session) => {
                              acc[session.status] = (acc[session.status] || 0) + 1;
                              return acc;
                            }, {} as Record<string, number>)
                          ).map(([status, count]) => (
                            <div key={status} className="flex items-center gap-1">
                              <Badge className={`${STATUS_LABELS[status as keyof typeof STATUS_LABELS]?.color || "bg-gray-500"} ${STATUS_LABELS[status as keyof typeof STATUS_LABELS]?.textColor || "text-white"} text-xs`}>
                                {STATUS_LABELS[status as keyof typeof STATUS_LABELS]?.label || status}
                              </Badge>
                              <span className="text-xs text-gray-600">({count})</span>
                            </div>
                          ))}
                        </div>
                      </div>
                      {group.nextSession && (
                        <div className="mt-3 pt-3 border-t">
                          <p className="text-sm font-medium">Próxima aula:</p>
                          <p className="text-sm text-gray-600">
                            {format(parseISO(group.nextSession.startTime), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                          </p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
            
            {/* Individual appointments (non-recurring) */}
            {filteredAppointments.filter(a => !a.recurrenceGroupId).length > 0 && (
              <div className="space-y-4">
                <Separator />
                <h3 className="text-lg font-semibold">Aulas Individuais</h3>
                {filteredAppointments
                  .filter(appointment => !appointment.recurrenceGroupId)
                  .map((appointment) => (
                    <Card key={appointment.id}>
                      <CardContent className="pt-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <User className="h-5 w-5 text-gray-500" />
                            <div>
                              <h4 className="font-medium">{appointment.service}</h4>
                              <p className="text-sm text-gray-600">
                                {appointment.lead?.name} • {appointment.trainer?.name}
                              </p>
                              <p className="text-sm text-gray-500">
                                {format(parseISO(appointment.startTime), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge className={getSourceColor(appointment.source)}>
                              {appointment.source}
                            </Badge>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="outline" size="sm">
                                  <Badge className={STATUS_LABELS[appointment.status as keyof typeof STATUS_LABELS]?.color || "bg-gray-500"}>
                                    {STATUS_LABELS[appointment.status as keyof typeof STATUS_LABELS]?.label || appointment.status}
                                  </Badge>
                                  <MoreVertical className="h-4 w-4 ml-2" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent>
                                {Object.entries(STATUS_LABELS).map(([key, value]) => (
                                  <DropdownMenuItem
                                    key={key}
                                    onClick={() => updateStatusMutation.mutate({ id: appointment.id, status: key })}
                                  >
                                    {value.label}
                                  </DropdownMenuItem>
                                ))}
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
              </div>
            )}
          </>
        ) : (
          // Individual view
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Todos os Agendamentos</h3>
            {filteredAppointments.map((appointment) => (
              <Card key={appointment.id}>
                <CardContent className="pt-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {appointment.recurrenceGroupId ? (
                        <Repeat className="h-5 w-5 text-blue-500" />
                      ) : (
                        <User className="h-5 w-5 text-gray-500" />
                      )}
                      <div>
                        <h4 className="font-medium">{appointment.service}</h4>
                        <p className="text-sm text-gray-600">
                          {appointment.lead?.name} • {appointment.trainer?.name}
                        </p>
                        <p className="text-sm text-gray-500">
                          {format(parseISO(appointment.startTime), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })} • {appointment.location}
                        </p>
                        {appointment.recurrenceGroupId && (
                          <p className="text-xs text-blue-600">Parte de serviço recorrente</p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge className={getSourceColor(appointment.source)}>
                        {appointment.source}
                      </Badge>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="outline" size="sm">
                            <Badge className={`${STATUS_LABELS[appointment.status as keyof typeof STATUS_LABELS]?.color || "bg-gray-500"} ${STATUS_LABELS[appointment.status as keyof typeof STATUS_LABELS]?.textColor || "text-white"}`}>
                              {STATUS_LABELS[appointment.status as keyof typeof STATUS_LABELS]?.label || appointment.status}
                            </Badge>
                            <MoreVertical className="h-4 w-4 ml-2" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent>
                          {Object.entries(STATUS_LABELS).map(([key, value]) => (
                            <DropdownMenuItem
                              key={key}
                              onClick={() => updateStatusMutation.mutate({ id: appointment.id, status: key })}
                            >
                              {value.label}
                            </DropdownMenuItem>
                          ))}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
        
        {filteredAppointments.length === 0 && filteredRecurringGroups.length === 0 && (
          <Card>
            <CardContent className="pt-6">
              <div className="text-center py-8">
                <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">Nenhum agendamento encontrado</h3>
                <p className="text-gray-500">Ajuste os filtros ou crie um novo agendamento.</p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Status Legend */}
        <Card>
          <CardHeader>
            <CardTitle>Legenda de Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
              {Object.entries(STATUS_LABELS).map(([key, value]) => (
                <div key={key} className="flex items-center gap-2">
                  <Badge className={`${value.color} ${value.textColor} text-xs`}>
                    {key}
                  </Badge>
                  <span className="text-sm text-gray-600">{value.label}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AppointmentsManagement;
