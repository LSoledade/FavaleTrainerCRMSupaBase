import { format, isSameDay, differenceInDays, addDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';

type SessionStatus = 'scheduled' | 'completed' | 'cancelled' | 'no-show' | 'agendado' | 'concluído' | 'cancelado';

interface Session {
  id: number;
  startTime: string;
  endTime: string;
  location: string;
  source: 'Favale' | 'Pink' | 'FavalePink';
  notes?: string;
  status: SessionStatus;
  leadId: number;
  trainerId: number;
  value?: number;
  service?: string;
  recurrenceType?: string;
  recurrenceGroupId?: string;
  isRecurrenceParent?: boolean;
  parentSessionId?: number;
}

interface RecurringGroup {
  pattern: string;
  sessions: Session[];
  studentName: string;
  trainerName: string;
  source: 'Favale' | 'Pink' | 'FavalePink';
  location: string;
  timeSlot: string;
  nextSession?: Session;
}

interface GroupedSessions {
  recurring: RecurringGroup[];
  individual: Session[];
}

/**
 * Detecta se um conjunto de sessões forma um padrão recorrente
 */
function detectRecurrencePattern(sessions: Session[]): string | null {
  if (sessions.length < 3) return null;

  const sortedSessions = sessions.sort((a, b) => 
    new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
  );

  // Filtrar apenas sessões recentes (últimos 6 meses) para evitar interferência de dados antigos
  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
  
  const recentSessions = sortedSessions.filter(session => 
    new Date(session.startTime) >= sixMonthsAgo
  );

  if (recentSessions.length < 3) return null;

  // Verificar padrão semanal
  const weeklyIntervals = [];
  for (let i = 1; i < recentSessions.length; i++) {
    const daysDiff = differenceInDays(
      new Date(recentSessions[i].startTime),
      new Date(recentSessions[i - 1].startTime)
    );
    weeklyIntervals.push(daysDiff);
  }

  // Se a maioria dos intervalos são de 7 dias (±2 dias de tolerância)
  const weeklyCount = weeklyIntervals.filter(diff => Math.abs(diff - 7) <= 2).length;
  if (weeklyCount >= weeklyIntervals.length * 0.6) {
    const dayOfWeek = format(new Date(recentSessions[0].startTime), 'EEEE', { locale: ptBR });
    return `Toda ${dayOfWeek}`;
  }

  // Verificar padrão quinzenal
  const biweeklyCount = weeklyIntervals.filter(diff => Math.abs(diff - 14) <= 3).length;
  if (biweeklyCount >= weeklyIntervals.length * 0.6) {
    const dayOfWeek = format(new Date(recentSessions[0].startTime), 'EEEE', { locale: ptBR });
    return `A cada 15 dias (${dayOfWeek})`;
  }

  // Verificar padrão mensal (aproximadamente 30 dias)
  const monthlyCount = weeklyIntervals.filter(diff => Math.abs(diff - 30) <= 7).length;
  if (monthlyCount >= weeklyIntervals.length * 0.6) {
    return 'Mensalmente';
  }

  return null;
}

/**
 * Agrupa sessões similares (mesmo aluno, professor, horário, local)
 */
function groupSimilarSessions(sessions: Session[]): Session[][] {
  const groups: Session[][] = [];

  for (const session of sessions) {
    const timeSlot = `${format(new Date(session.startTime), 'HH:mm')} - ${format(new Date(session.endTime), 'HH:mm')}`;
    
    // Procurar grupo existente com características similares
    const existingGroup = groups.find(group => {
      if (group.length === 0) return false;
      
      const firstSession = group[0];
      const firstTimeSlot = `${format(new Date(firstSession.startTime), 'HH:mm')} - ${format(new Date(firstSession.endTime), 'HH:mm')}`;
      
      return (
        firstSession.leadId === session.leadId &&
        firstSession.trainerId === session.trainerId &&
        firstSession.location === session.location &&
        firstSession.source === session.source &&
        firstTimeSlot === timeSlot
      );
    });

    if (existingGroup) {
      existingGroup.push(session);
    } else {
      groups.push([session]);
    }
  }

  return groups;
}

/**
 * Agrupa sessões em recorrentes e individuais
 */
export function groupSessions(
  sessions: Session[],
  getStudentName: (leadId: number) => string,
  getTrainerName: (trainerId: number) => string
): GroupedSessions {
  const recurring: RecurringGroup[] = [];
  let individualSessions: Session[] = [];

  // Group by recurrenceGroupId
  const recurrenceGroups = new Map<string, Session[]>();
  
  for (const session of sessions) {
    if (session.recurrenceGroupId && session.recurrenceType !== 'none') {
      if (!recurrenceGroups.has(session.recurrenceGroupId)) {
        recurrenceGroups.set(session.recurrenceGroupId, []);
      }
      recurrenceGroups.get(session.recurrenceGroupId)!.push(session);
    } else {
      individualSessions.push(session);
    }
  }

  // Create recurring groups from recurrence groups
  Array.from(recurrenceGroups.entries()).forEach(([groupId, groupSessions]) => {
    if (groupSessions.length > 1) {
      const sortedSessions = groupSessions.sort((a: Session, b: Session) => 
        new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
      );

      const firstSession = sortedSessions[0];
      const timeSlot = `${format(new Date(firstSession.startTime), 'HH:mm')} - ${format(new Date(firstSession.endTime), 'HH:mm')}`;
      
      // Generate pattern based on recurrence type
      let pattern = '';
      switch (firstSession.recurrenceType) {
        case 'daily':
          pattern = 'Diariamente';
          break;
        case 'weekly':
          const dayOfWeek = format(new Date(firstSession.startTime), 'EEEE', { locale: ptBR });
          pattern = `Toda ${dayOfWeek}`;
          break;
        case 'monthly':
          pattern = 'Mensalmente';
          break;
        case 'yearly':
          pattern = 'Anualmente';
          break;
        default:
          pattern = 'Recorrente';
      }
      
      const recurringGroup: RecurringGroup = {
        pattern,
        sessions: sortedSessions,
        studentName: getStudentName(firstSession.leadId),
        trainerName: getTrainerName(firstSession.trainerId),
        source: firstSession.source,
        location: firstSession.location,
        timeSlot,
        nextSession: sortedSessions
          .filter((s: Session) => new Date(s.startTime) > new Date() && s.status === 'scheduled')
          .sort((a: Session, b: Session) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime())[0]
      };

      recurring.push(recurringGroup);
    } else {
      individualSessions.push(...groupSessions);
    }
  });

  // For sessions without recurrence data, try to detect patterns (legacy support)
  const unGroupedSessions = individualSessions.filter(s => !s.recurrenceGroupId);
  const sessionGroups = groupSimilarSessions(unGroupedSessions);
  const finalIndividual = individualSessions.filter(s => s.recurrenceGroupId);

  for (const group of sessionGroups) {
    if (group.length >= 3) {
      const pattern = detectRecurrencePattern(group);
      
      if (pattern) {
        const firstSession = group[0];
        const timeSlot = `${format(new Date(firstSession.startTime), 'HH:mm')} - ${format(new Date(firstSession.endTime), 'HH:mm')}`;
        
        const recurringGroup: RecurringGroup = {
          pattern,
          sessions: group,
          studentName: getStudentName(firstSession.leadId),
          trainerName: getTrainerName(firstSession.trainerId),
          source: firstSession.source,
          location: firstSession.location,
          timeSlot,
          nextSession: group
            .filter(s => new Date(s.startTime) > new Date() && s.status === 'scheduled')
            .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime())[0]
        };
        
        recurring.push(recurringGroup);
      } else {
        finalIndividual.push(...group);
      }
    } else {
      finalIndividual.push(...group);
    }
  }

  return { recurring, individual: finalIndividual };
}

/**
 * Obtém estatísticas de um grupo recorrente
 */
export function getRecurringGroupStats(group: RecurringGroup) {
  const upcoming = group.sessions.filter(s => 
    new Date(s.startTime) > new Date() && s.status === 'scheduled'
  ).length;

  const completed = group.sessions.filter(s => 
    s.status === 'completed'
  ).length;

  const cancelled = group.sessions.filter(s => 
    s.status === 'cancelled'
  ).length;

  const noShow = group.sessions.filter(s => 
    s.status === 'no-show'
  ).length;

  return {
    total: group.sessions.length,
    upcoming,
    completed,
    cancelled,
    noShow,
    completionRate: group.sessions.length > 0 ? (completed / group.sessions.length) * 100 : 0
  };
}