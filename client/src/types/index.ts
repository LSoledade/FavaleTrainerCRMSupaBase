// Interface para professores (baseada nos users com role='professor')
export interface IProfessor {
  id: number;
  username: string;
  role: 'admin' | 'professor';
  name?: string;
  email?: string;
  phone?: string;
  address?: string;
  specialty?: string;
  bio?: string;
  hourlyRate?: number;
  specialties?: string[];
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

// Interface para regras de recorrência
export interface IRegraRecorrencia {
  type: 'daily' | 'weekly' | 'monthly' | 'yearly' | 'custom';
  interval: number; // A cada X dias/semanas/meses
  weekDays?: string[]; // ['monday', 'wednesday', 'friday'] para recorrência semanal
  monthDay?: number; // Dia do mês (1-31) para recorrência mensal
  endType: 'never' | 'date' | 'count';
  endDate?: Date;
  endCount?: number;
}

// Interface para agendamentos recorrentes
export interface IAgendamentoRecorrente {
  id: number;
  professorId: number;
  studentId: number;
  location: string;
  value: number; // Valor em centavos
  service: string;
  notes?: string;
  regras: IRegraRecorrencia;
  startDate: string;
  endDate?: string;
  maxOccurrences?: number;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

// Interface para informações do aluno no agendamento
export interface IStudent {
  id: number;
  name: string;
  email?: string;
  phone?: string;
  notes?: string;
}

// Interface para aulas individuais (compatível com react-big-calendar)
export interface IAula {
  id: number;
  agendamentoRecorrenteId?: number;
  professorId: number;
  studentId: number;
  startTime: string;
  endTime: string;
  location: string;
  value: number;
  service: string;
  notes?: string;
  status: 'agendado' | 'em_andamento' | 'concluido' | 'cancelado' | 'remarcado';
  isModified: boolean;
  originalStartTime?: string;
  originalEndTime?: string;
  createdAt: string;
  updatedAt: string;
  
  // Campos necessários para react-big-calendar
  title: string; // Será gerado a partir do service e nome do aluno
  start?: Date; // Será convertido de startTime
  end?: Date; // Será convertido de endTime
  resource?: any; // Dados adicionais para o calendário
  
  // Informações relacionadas (vindas das joins)
  professor?: IProfessor;
  student?: IStudent;
}

// Interface para formulário de nova recorrência
export interface INewRecurrenceForm {
  professorId: number;
  studentId: number;
  location: string;
  value: number;
  service: string;
  notes?: string;
  startDate: Date;
  startTime: string;
  endTime: string;
  recurrence: IRegraRecorrencia;
}

// Interface para o contexto de aulas/agendamentos
export interface ISchedulingContext {
  aulas: IAula[];
  agendamentosRecorrentes: IAgendamentoRecorrente[];
  isLoading: boolean;
  error: string | null;
  fetchAulas: (filters?: any) => Promise<void>;
  createRecurrence: (recurrence: INewRecurrenceForm) => Promise<void>;
  updateAula: (id: number, data: Partial<IAula>) => Promise<void>;
  deleteAula: (id: number) => Promise<void>;
  checkConflicts: (professorId: number, studentId: number, startTime: Date, endTime: Date) => Promise<boolean>;
}