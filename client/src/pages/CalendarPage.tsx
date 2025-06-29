import { useState, useCallback, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Calendar, momentLocalizer, Event, View } from "react-big-calendar";
import moment from "moment";
import "react-big-calendar/lib/css/react-big-calendar.css";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Filter, RefreshCw, Calendar as CalendarIcon, List } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import MultiDateAppointmentDialog from "@/components/scheduling/MultiDateAppointmentDialog";
import AppointmentDetailsDialog from "@/components/scheduling/AppointmentDetailsDialog";
import { RecurringAppointmentDialog } from "@/components/scheduling/RecurringAppointmentDialog";
import AppointmentsManagement from "@/components/scheduling/AppointmentsManagement";
import type { IAula, IProfessor } from "@/types";

// Setup moment localizer for react-big-calendar
const localizer = momentLocalizer(moment);

// Configure moment to Portuguese
moment.locale('pt-br', {
  months: 'Janeiro_Fevereiro_Março_Abril_Maio_Junho_Julho_Agosto_Setembro_Outubro_Novembro_Dezembro'.split('_'),
  monthsShort: 'Jan_Fev_Mar_Abr_Mai_Jun_Jul_Ago_Set_Out_Nov_Dez'.split('_'),
  weekdays: 'Domingo_Segunda_Terça_Quarta_Quinta_Sexta_Sábado'.split('_'),
  weekdaysShort: 'Dom_Seg_Ter_Qua_Qui_Sex_Sáb'.split('_'),
  weekdaysMin: 'Do_Se_Te_Qu_Qu_Se_Sá'.split('_'),
});

export default function CalendarPage() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [currentView, setCurrentView] = useState<View>("month");
  const [selectedEvent, setSelectedEvent] = useState<IAula | null>(null);
  const [isAppointmentDialogOpen, setIsAppointmentDialogOpen] = useState(false);
  const [isDetailsDialogOpen, setIsDetailsDialogOpen] = useState(false);
  const [isRecurringDialogOpen, setIsRecurringDialogOpen] = useState(false);
  const [filterProfessor, setFilterProfessor] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");

  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Calculate date range for queries
  const dateRange = useMemo(() => {
    let startOfPeriod: moment.Moment;
    let endOfPeriod: moment.Moment;

    switch (currentView) {
      case "day":
        startOfPeriod = moment(currentDate).startOf("day");
        endOfPeriod = moment(currentDate).endOf("day");
        break;
      case "week":
        startOfPeriod = moment(currentDate).startOf("week");
        endOfPeriod = moment(currentDate).endOf("week");
        break;
      case "month":
        startOfPeriod = moment(currentDate).startOf("month").startOf("week");
        endOfPeriod = moment(currentDate).endOf("month").endOf("week");
        break;
      default:
        startOfPeriod = moment(currentDate).startOf("month");
        endOfPeriod = moment(currentDate).endOf("month");
    }

    // Add buffer to ensure we capture all events
    const start = startOfPeriod.subtract(1, 'week').toDate();
    const end = endOfPeriod.add(1, 'week').toDate();
    return { start, end };
  }, [currentDate, currentView]);

  // Fetch appointments/classes
  const { data: appointments = [], isLoading: isLoadingAppointments, error: appointmentsError, refetch } = useQuery({
    queryKey: ["/api/appointments", dateRange],
    queryFn: async () => {
      const response = await fetch("/api/appointments");
      if (!response.ok) {
        throw new Error('Failed to fetch appointments');
      }
      return response.json();
    },
  });

  // Fetch professors for filter
  const { data: professors = [] } = useQuery({
    queryKey: ["/api/users/professors"],
    select: (data) => data as IProfessor[]
  });

  // Transform appointments for react-big-calendar
  const events: Event[] = useMemo(() => {
    let filteredAppointments = appointments;

    // Apply professor filter
    if (filterProfessor !== "all") {
      filteredAppointments = filteredAppointments.filter(
        (appointment: IAula) => appointment.professorId === parseInt(filterProfessor)
      );
    }

    // Apply status filter
    if (filterStatus !== "all") {
      filteredAppointments = filteredAppointments.filter(
        (appointment: IAula) => appointment.status === filterStatus
      );
    }

    return filteredAppointments.map((appointment: IAula) => ({
      id: appointment.id,
      title: appointment.title || appointment.service || "Aula",
      start: new Date(appointment.startTime),
      end: new Date(appointment.endTime),
      resource: appointment,
    }));
  }, [appointments, filterProfessor, filterStatus]);

  // Event style getter for color coding
  const eventStyleGetter = useCallback((event: Event) => {
    const appointment = event.resource as IAula;
    let backgroundColor = '#3174ad'; // default blue

    switch (appointment.status) {
      case 'agendado':
        backgroundColor = '#3b82f6'; // blue
        break;
      case 'em_andamento':
        backgroundColor = '#f59e0b'; // amber
        break;
      case 'concluido':
        backgroundColor = '#10b981'; // green
        break;
      case 'cancelado':
        backgroundColor = '#ef4444'; // red
        break;
      case 'remarcado':
        backgroundColor = '#8b5cf6'; // purple
        break;
    }

    return {
      style: {
        backgroundColor,
        borderRadius: '4px',
        opacity: 0.8,
        color: 'white',
        border: '0px',
        display: 'block',
        fontSize: '0.875rem',
        padding: '2px 4px',
      }
    };
  }, []);

  // Handle event selection for details view
  const handleSelectEvent = useCallback((event: Event) => {
    setSelectedEvent(event.resource as IAula);
    setIsDetailsDialogOpen(true);
  }, []);

  // Handle date navigation
  const handleNavigate = useCallback((newDate: Date) => {
    setCurrentDate(newDate);
  }, []);

  // Handle view change
  const handleViewChange = useCallback((view: View) => {
    setCurrentView(view);
  }, []);

  // Handle appointment dialog close (for creation)
  const handleAppointmentDialogClose = useCallback(() => {
    setIsAppointmentDialogOpen(false);
    setSelectedEvent(null);
    // Refetch appointments to update the calendar
    refetch();
  }, [refetch]);

  // Handle details dialog close (for viewing)
  const handleDetailsDialogClose = useCallback(() => {
    setIsDetailsDialogOpen(false);
    setSelectedEvent(null);
    // Refetch appointments to update the calendar
    refetch();
  }, [refetch]);

  // Handle edit from details dialog
  const handleEditAppointment = useCallback((appointment: IAula) => {
    setSelectedEvent(appointment);
    setIsDetailsDialogOpen(false);
    setIsAppointmentDialogOpen(true);
  }, []);

  // Handle recurring dialog close
  const handleRecurringDialogClose = useCallback(() => {
    setIsRecurringDialogOpen(false);
    // Refetch appointments to update the calendar
    refetch();
  }, [refetch]);

  // Handle refresh
  const handleRefresh = useCallback(() => {
    refetch();
    toast({
      title: "Calendário atualizado",
      description: "Os agendamentos foram atualizados com sucesso.",
    });
  }, [refetch, toast]);

  // Custom messages for Portuguese
  const messages = {
    allDay: 'Dia inteiro',
    previous: 'Anterior',
    next: 'Próximo',
    today: 'Hoje',
    month: 'Mês',
    week: 'Semana',
    day: 'Dia',
    agenda: 'Agenda',
    date: 'Data',
    time: 'Horário',
    event: 'Evento',
    noEventsInRange: 'Não há eventos neste período.',
    showMore: (total: number) => `+ ${total} mais`,
  };



  const getEventColor = (source: 'Favale' | 'Pink' | 'FavalePink') => {
    switch (source) {
      case 'Favale':
        return '#2563eb'; // Blue
      case 'Pink':
        return '#db2777'; // Pink
      case 'FavalePink':
        return '#7e22ce'; // Purple
      default:
        return '#6b7280'; // Gray
    }
  };

  const handleSelectSlot = useCallback(
    (slotInfo: any) => {
      console.log('selected slot', slotInfo);
    },
    []
  );


  if (appointmentsError) {
    console.error("Error loading appointments:", appointmentsError);
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={isLoadingAppointments}
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Atualizar
          </Button>

          <Button
            onClick={() => setIsAppointmentDialogOpen(true)}
            className="bg-pink-600 hover:bg-pink-700"
          >
            <Plus className="h-4 w-4 mr-2" />
            Novo Agendamento
          </Button>

          <Button
            onClick={() => setIsRecurringDialogOpen(true)}
            className="bg-purple-600 hover:bg-purple-700"
          >
            <Plus className="h-4 w-4 mr-2" />
            Agendar Serviço Recorrente
          </Button>
        </div>
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
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <label className="text-sm font-medium text-gray-700 mb-2 block">
                Professor
              </label>
              <Select value={filterProfessor} onValueChange={setFilterProfessor}>
                <SelectTrigger>
                  <SelectValue placeholder="Todos os professores" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os professores</SelectItem>
                  {professors.map((professor) => (
                    <SelectItem key={professor.id} value={professor.id.toString()}>
                      {professor.name || professor.username}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex-1">
              <label className="text-sm font-medium text-gray-700 mb-2 block">
                Status
              </label>
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger>
                  <SelectValue placeholder="Todos os status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os status</SelectItem>
                  <SelectItem value="agendado">Agendado</SelectItem>
                  <SelectItem value="em_andamento">Em Andamento</SelectItem>
                  <SelectItem value="concluido">Concluído</SelectItem>
                  <SelectItem value="cancelado">Cancelado</SelectItem>
                  <SelectItem value="remarcado">Remarcado</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Legend */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap gap-4">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-blue-500 rounded"></div>
              <span className="text-sm">Agendado</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-amber-500 rounded"></div>
              <span className="text-sm">Em Andamento</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-green-500 rounded"></div>
              <span className="text-sm">Concluído</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-red-500 rounded"></div>
              <span className="text-sm">Cancelado</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-purple-500 rounded"></div>
              <span className="text-sm">Remarcado</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Calendar */}
      <Card>
        <CardContent className="p-6">
          <Tabs defaultValue="calendar" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="calendar" className="flex items-center gap-2">
                <CalendarIcon className="h-4 w-4" />
                Calendário
              </TabsTrigger>
              <TabsTrigger value="appointments" className="flex items-center gap-2">
                <List className="h-4 w-4" />
                Agendamentos
              </TabsTrigger>
            </TabsList>

            <TabsContent value="calendar" className="mt-6">
              {isLoadingAppointments ? (
                <div className="text-center">
                  <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4 text-pink-600" />
                  <p className="text-gray-600">Carregando agendamentos...</p>
                </div>
              ) : (
                <div className="h-[600px]">
                  <Calendar
                    localizer={localizer}
                    events={events}
                    startAccessor="start"
                    endAccessor="end"
                    style={{ height: '100%' }}
                    onSelectEvent={handleSelectEvent}
                    onNavigate={handleNavigate}
                    onView={handleViewChange}
                    view={currentView}
                    date={currentDate}
                    eventPropGetter={eventStyleGetter}
                    messages={messages}
                    formats={{
                      monthHeaderFormat: 'MMMM YYYY',
                      dayHeaderFormat: 'dddd, DD/MM/YYYY',
                      weekdayFormat: 'ddd',
                    }}
                  />
                </div>
              )}
            </TabsContent>

            <TabsContent value="appointments" className="mt-6">
              <AppointmentsManagement onRefresh={refetch} />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Create/Edit Appointment Dialog */}
      <MultiDateAppointmentDialog
        isOpen={isAppointmentDialogOpen}
        onClose={handleAppointmentDialogClose}
        professors={professors}
      />

      {/* Appointment Details Dialog */}
      <AppointmentDetailsDialog
        isOpen={isDetailsDialogOpen}
        onClose={handleDetailsDialogClose}
        appointment={selectedEvent}
        onEdit={handleEditAppointment}
      />

      {/* Recurring Appointment Dialog */}
      <RecurringAppointmentDialog
        isOpen={isRecurringDialogOpen}
        onClose={handleRecurringDialogClose}
      />
    </div>
  );
}