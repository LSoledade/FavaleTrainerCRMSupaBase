import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Plus, User, Clock, MapPin, DollarSign, FileText } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface Lead {
  id: number;
  name: string;
  email?: string;
  phone?: string;
}

interface Service {
  id: number;
  name: string;
  description?: string;
  duration: number;
  price: number;
}

interface Professor {
  id: number;
  name: string;
  email: string;
}

interface TimeSlot {
  hour: number;
  selected: boolean;
}

interface DaySchedule {
  dayOfWeek: number;
  selected: boolean;
  timeSlots: TimeSlot[];
  selectedProfessors: number[];
}

interface RecurringAppointmentDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

const WEEKDAYS = [
  { value: 1, label: 'Segunda-feira', short: 'SEG' },
  { value: 2, label: 'Terça-feira', short: 'TER' },
  { value: 3, label: 'Quarta-feira', short: 'QUA' },
  { value: 4, label: 'Quinta-feira', short: 'QUI' },
  { value: 5, label: 'Sexta-feira', short: 'SEX' },
  { value: 6, label: 'Sábado', short: 'SAB' },
  { value: 0, label: 'Domingo', short: 'DOM' }
];

// Generate time slots from 04:00 to 22:00 (1-hour blocks)
const generateTimeSlots = (): TimeSlot[] => {
  const slots: TimeSlot[] = [];
  for (let hour = 4; hour <= 22; hour++) {
    slots.push({ hour, selected: false });
  }
  return slots;
};

// Initial weekly schedule - memoized to prevent recreating on every render
const createInitialWeeklySchedule = (): DaySchedule[] => {
  return WEEKDAYS.map(day => ({
    dayOfWeek: day.value,
    selected: false,
    timeSlots: generateTimeSlots(),
    selectedProfessors: []
  }));
};

const formatHour = (hour: number): string => {
  return `${hour.toString().padStart(2, '0')}:00`;
};

export function RecurringAppointmentDialog({ isOpen, onClose }: RecurringAppointmentDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // Form state
  const [selectedStudentId, setSelectedStudentId] = useState<number | null>(null);
  const [selectedServiceId, setSelectedServiceId] = useState<number | null>(null);
  const [startDate, setStartDate] = useState('');
  const [location, setLocation] = useState('');
  const [value, setValue] = useState<number>(0);
  const [notes, setNotes] = useState('');
  const [weeklySchedule, setWeeklySchedule] = useState<DaySchedule[]>(() => createInitialWeeklySchedule());
  const [showNewStudentForm, setShowNewStudentForm] = useState(false);
  const [newStudentName, setNewStudentName] = useState('');
  const [newStudentEmail, setNewStudentEmail] = useState('');
  const [newStudentPhone, setNewStudentPhone] = useState('');

  // Fetch data only when dialog opens - with better error handling
  const { data: leads = [], isLoading: isLoadingLeads, error: leadsError } = useQuery<Lead[]>({
    queryKey: ['/api/leads'],
    queryFn: async () => {
      const response = await fetch('/api/leads');
      if (!response.ok) {
        throw new Error(`Failed to fetch leads: ${response.statusText}`);
      }
      return response.json();
    },
    enabled: isOpen,
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 3,
    retryDelay: 1000
  });

  const { data: services = [], isLoading: isLoadingServices, error: servicesError } = useQuery<Service[]>({
    queryKey: ['/api/services'],
    queryFn: async () => {
      const response = await fetch('/api/services');
      if (!response.ok) {
        throw new Error(`Failed to fetch services: ${response.statusText}`);
      }
      return response.json();
    },
    enabled: isOpen,
    staleTime: 5 * 60 * 1000,
    retry: 3,
    retryDelay: 1000
  });

  const { data: professors = [], isLoading: isLoadingProfessors, error: professorsError } = useQuery<Professor[]>({
    queryKey: ['/api/users/professors'],
    queryFn: async () => {
      const response = await fetch('/api/users/professors');
      if (!response.ok) {
        throw new Error(`Failed to fetch professors: ${response.statusText}`);
      }
      return response.json();
    },
    enabled: isOpen,
    staleTime: 5 * 60 * 1000,
    retry: 3,
    retryDelay: 1000
  });

  // Log errors to help with debugging
  if (leadsError) {
    console.error('Error loading leads:', leadsError);
  }
  if (servicesError) {
    console.error('Error loading services:', servicesError);
  }
  if (professorsError) {
    console.error('Error loading professors:', professorsError);
  }

  // Create new student mutation
  const createStudentMutation = useMutation({
    mutationFn: async (studentData: { name: string; email?: string; phone?: string }) => {
      const response = await fetch('/api/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...studentData,
          status: 'ativo',
          source: 'agendamento_recorrente',
          entryDate: new Date().toISOString()
        })
      });
      if (!response.ok) throw new Error('Failed to create student');
      return response.json();
    },
    onSuccess: (newStudent) => {
      queryClient.invalidateQueries({ queryKey: ['/api/leads'] });
      setSelectedStudentId(newStudent.id);
      setShowNewStudentForm(false);
      setNewStudentName('');
      setNewStudentEmail('');
      setNewStudentPhone('');
      toast({
        title: "Aluno criado",
        description: "Novo aluno adicionado com sucesso."
      });
    }
  });

  // Create recurring appointment mutation
  const createRecurringMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await fetch('/api/appointments/recurring', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      if (!response.ok) throw new Error('Failed to create recurring appointment');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/appointments'] });
      toast({
        title: "Agendamento criado",
        description: "Agendamento recorrente criado com sucesso!"
      });
      handleClose();
    }
  });

  // Handle day selection
  const handleDayToggle = (dayIndex: number) => {
    setWeeklySchedule(prev => 
      prev.map((day, idx) => 
        idx === dayIndex 
          ? { 
              ...day, 
              selected: !day.selected,
              timeSlots: generateTimeSlots(),
              selectedProfessors: []
            }
          : day
      )
    );
  };

  // Handle time slot selection
  const handleTimeSlotToggle = (dayIndex: number, slotIndex: number) => {
    setWeeklySchedule(prev => 
      prev.map((day, idx) => 
        idx === dayIndex 
          ? {
              ...day,
              timeSlots: day.timeSlots.map((slot, sIdx) =>
                sIdx === slotIndex ? { ...slot, selected: !slot.selected } : slot
              )
            }
          : day
      )
    );
  };

  // Handle professor selection
  const handleProfessorToggle = (dayIndex: number, professorId: number) => {
    setWeeklySchedule(prev => 
      prev.map((day, idx) => 
        idx === dayIndex 
          ? {
              ...day,
              selectedProfessors: day.selectedProfessors.includes(professorId)
                ? day.selectedProfessors.filter(id => id !== professorId)
                : [...day.selectedProfessors, professorId]
            }
          : day
      )
    );
  };

  // Handle form submission
  const handleSubmit = () => {
    if (!selectedStudentId || !selectedServiceId || !startDate) {
      toast({
        title: "Campos obrigatórios",
        description: "Preencha aluno, serviço e data de início.",
        variant: "destructive"
      });
      return;
    }

    const selectedDays = weeklySchedule.filter(day => 
      day.selected && 
      day.timeSlots.some(slot => slot.selected) &&
      day.selectedProfessors.length > 0
    );
    
    if (selectedDays.length === 0) {
      toast({
        title: "Selecione agendamentos",
        description: "Selecione pelo menos um dia com horários e professores.",
        variant: "destructive"
      });
      return;
    }

    const student = leads.find(lead => lead.id === selectedStudentId);
    const service = services.find(s => s.id === selectedServiceId);

    // Build weekly schedule for API
    const weeklyScheduleData = selectedDays.map(day => ({
      dayOfWeek: day.dayOfWeek,
      professorsSchedule: day.selectedProfessors.map(profId => ({
        professorId: profId,
        timeSlots: day.timeSlots
          .filter(slot => slot.selected)
          .map(slot => ({
            startTime: formatHour(slot.hour),
            endTime: formatHour(slot.hour + 1)
          }))
      }))
    }));

    createRecurringMutation.mutate({
      studentName: student?.name,
      service: service?.name,
      location,
      value,
      notes,
      startDate,
      endDate: new Date(new Date(startDate).setMonth(new Date(startDate).getMonth() + 3)).toISOString(),
      weeklySchedule: weeklyScheduleData
    });
  };

  const handleClose = () => {
    setSelectedStudentId(null);
    setSelectedServiceId(null);
    setStartDate('');
    setLocation('');
    setValue(0);
    setNotes('');
    setWeeklySchedule(createInitialWeeklySchedule());
    setShowNewStudentForm(false);
    setNewStudentName('');
    setNewStudentEmail('');
    setNewStudentPhone('');
    onClose();
  };

  const selectedService = services.find(s => s.id === selectedServiceId);

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5" />
            Agendar Serviço Recorrente
          </DialogTitle>
          <DialogDescription>
            Configure agendamentos recorrentes selecionando dias, horários e professores.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Student Selection */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <User className="h-4 w-4" />
              Aluno
            </Label>
            <div className="flex gap-2">
              <Select value={selectedStudentId?.toString() || ''} onValueChange={(value) => setSelectedStudentId(Number(value))}>
                <SelectTrigger className="flex-1">
                  <SelectValue placeholder="Selecione um aluno" />
                </SelectTrigger>
                <SelectContent>
                  {leads.map((lead) => (
                    <SelectItem key={lead.id} value={lead.id.toString()}>
                      {lead.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button 
                variant="outline" 
                onClick={() => setShowNewStudentForm(true)}
                className="px-3"
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* New Student Form */}
          {showNewStudentForm && (
            <Card>
              <CardHeader>
                <CardTitle>Adicionar Novo Aluno</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>Nome *</Label>
                  <Input
                    value={newStudentName}
                    onChange={(e) => setNewStudentName(e.target.value)}
                    placeholder="Nome do aluno"
                  />
                </div>
                <div>
                  <Label>Email</Label>
                  <Input
                    type="email"
                    value={newStudentEmail}
                    onChange={(e) => setNewStudentEmail(e.target.value)}
                    placeholder="email@exemplo.com"
                  />
                </div>
                <div>
                  <Label>Telefone</Label>
                  <Input
                    value={newStudentPhone}
                    onChange={(e) => setNewStudentPhone(e.target.value)}
                    placeholder="(11) 99999-9999"
                  />
                </div>
                <div className="flex gap-2">
                  <Button 
                    onClick={() => createStudentMutation.mutate({
                      name: newStudentName,
                      email: newStudentEmail || undefined,
                      phone: newStudentPhone || undefined
                    })}
                    disabled={!newStudentName || createStudentMutation.isPending}
                  >
                    Criar Aluno
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={() => setShowNewStudentForm(false)}
                  >
                    Cancelar
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Service Selection */}
          <div className="space-y-2">
            <Label>Serviço</Label>
            <Select value={selectedServiceId?.toString() || ''} onValueChange={(value) => setSelectedServiceId(Number(value))}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione um serviço" />
              </SelectTrigger>
              <SelectContent>
                {services.map((service) => (
                  <SelectItem key={service.id} value={service.id.toString()}>
                    {service.name} - {service.duration}min
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Start Date */}
            <div className="space-y-2">
              <Label>Data de Início</Label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>

            {/* Location */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                Local
              </Label>
              <Input
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="Local do atendimento"
              />
            </div>

            {/* Value */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <DollarSign className="h-4 w-4" />
                Valor (R$)
              </Label>
              <Input
                type="number"
                value={value / 100}
                onChange={(e) => setValue(Math.round(Number(e.target.value) * 100))}
                placeholder={selectedService ? (selectedService.price / 100).toFixed(2) : "0.00"}
                step="0.01"
              />
            </div>
          </div>

          {/* Weekly Schedule */}
          <div className="space-y-4">
            <Label className="text-lg font-semibold">Programação Semanal</Label>
            
            {WEEKDAYS.map((weekday, dayIndex) => {
              const daySchedule = weeklySchedule[dayIndex];
              const selectedTimeSlots = daySchedule.timeSlots.filter(slot => slot.selected);
              
              return (
                <Card key={weekday.value} className={daySchedule.selected ? 'border-pink-500' : ''}>
                  <CardHeader className="pb-3">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        checked={daySchedule.selected}
                        onCheckedChange={() => handleDayToggle(dayIndex)}
                      />
                      <CardTitle className="text-base">{weekday.label}</CardTitle>
                      {daySchedule.selected && selectedTimeSlots.length > 0 && (
                        <span className="text-sm text-gray-500">
                          ({selectedTimeSlots.length} horário{selectedTimeSlots.length > 1 ? 's' : ''})
                        </span>
                      )}
                    </div>
                  </CardHeader>
                  
                  {daySchedule.selected && (
                    <CardContent className="space-y-4">
                      {/* Time Slots Grid */}
                      <div className="space-y-2">
                        <Label className="flex items-center gap-2">
                          <Clock className="h-4 w-4" />
                          Horários (1 hora cada)
                        </Label>
                        
                        <div className="grid grid-cols-6 gap-2">
                          {daySchedule.timeSlots.map((slot, slotIndex) => (
                            <Button
                              key={slot.hour}
                              variant={slot.selected ? "default" : "outline"}
                              size="sm"
                              onClick={() => handleTimeSlotToggle(dayIndex, slotIndex)}
                              className={`text-xs ${slot.selected ? 'bg-pink-600 hover:bg-pink-700' : ''}`}
                            >
                              {formatHour(slot.hour)}
                            </Button>
                          ))}
                        </div>
                      </div>

                      {/* Professors Selection */}
                      {selectedTimeSlots.length > 0 && (
                        <div className="space-y-2">
                          <Label>Professores</Label>
                          <div className="grid grid-cols-2 gap-2">
                            {professors.map((professor) => (
                              <div key={professor.id} className="flex items-center space-x-2">
                                <Checkbox
                                  checked={daySchedule.selectedProfessors.includes(professor.id)}
                                  onCheckedChange={() => handleProfessorToggle(dayIndex, professor.id)}
                                />
                                <span className="text-sm">{professor.name}</span>
                              </div>
                            ))}
                          </div>
                          {daySchedule.selectedProfessors.length > 0 && (
                            <p className="text-sm text-green-600">
                              {daySchedule.selectedProfessors.length} professor{daySchedule.selectedProfessors.length > 1 ? 'es' : ''} selecionado{daySchedule.selectedProfessors.length > 1 ? 's' : ''}
                            </p>
                          )}
                        </div>
                      )}
                    </CardContent>
                  )}
                </Card>
              );
            })}
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Observações
            </Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Observações adicionais..."
              rows={3}
            />
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button variant="outline" onClick={handleClose}>
              Cancelar
            </Button>
            <Button 
              onClick={handleSubmit}
              disabled={createRecurringMutation.isPending}
              className="bg-purple-600 hover:bg-purple-700"
            >
              {createRecurringMutation.isPending ? 'Criando...' : 'Criar Agendamentos'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}