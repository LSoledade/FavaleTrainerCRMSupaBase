import type { Request, Response } from "express";
import { storage } from "../storage";
import { agendamentoRecorrenteValidationSchema, aulaValidationSchema } from "../../shared/schema";
import { ZodError } from "zod";

// MÉTODOS PARA AGENDAMENTOS RECORRENTES

/**
 * Criar um novo agendamento recorrente
 * Gera automaticamente as instâncias de aula para os próximos 6 meses
 */
export const createRecurrentScheduling = async (req: Request, res: Response) => {
  try {
    // Validar dados de entrada
    const validatedData = agendamentoRecorrenteValidationSchema.parse(req.body);

    // Verificar se professor existe
    const professor = await storage.getUserById(validatedData.professorId);
    if (!professor || professor.role !== 'professor') {
      return res.status(400).json({ message: "Professor não encontrado" });
    }

    // Verificar se aluno (lead) existe
    const student = await storage.getLeadById(validatedData.studentId);
    if (!student) {
      return res.status(400).json({ message: "Aluno não encontrado" });
    }

    // Criar o agendamento recorrente
    const agendamento = await storage.createAgendamentoRecorrente(validatedData);

    // Gerar instâncias de aulas para os próximos 6 meses
    const aulas = await generateRecurrentClasses(agendamento);

    // Validar conflitos para cada aula
    const conflicts = [];
    for (const aula of aulas) {
      const hasConflict = await storage.checkSchedulingConflicts(
        aula.professorId,
        aula.studentId,
        new Date(aula.startTime),
        new Date(aula.endTime)
      );
      
      if (hasConflict) {
        conflicts.push({
          date: aula.startTime,
          conflict: hasConflict
        });
      }
    }

    // Se há conflitos, retornar erro 409
    if (conflicts.length > 0) {
      return res.status(409).json({
        message: "Conflito de horário detectado",
        conflicts: conflicts
      });
    }

    // Criar todas as aulas
    const createdAulas = await storage.createMultipleAulas(aulas);

    res.status(201).json({
      agendamento,
      aulas: createdAulas
    });
  } catch (error) {
    if (error instanceof ZodError) {
      return res.status(400).json({
        message: "Dados inválidos",
        errors: error.errors.map(err => ({
          field: err.path.join("."),
          message: err.message
        }))
      });
    }
    console.error("Erro ao criar agendamento recorrente:", error);
    res.status(500).json({ message: "Erro ao criar agendamento recorrente" });
  }
};

/**
 * Buscar todas as aulas (instâncias individuais)
 */
export const getClasses = async (req: Request, res: Response) => {
  try {
    const { start, end, professorId, studentId, status } = req.query;

    const filters: any = {};
    
    if (start) filters.startDate = new Date(start as string);
    if (end) filters.endDate = new Date(end as string);
    if (professorId) filters.professorId = parseInt(professorId as string);
    if (studentId) filters.studentId = parseInt(studentId as string);
    if (status) filters.status = status as string;

    const aulas = await storage.getAulas(filters);

    // Transformar dados para compatibilidade com react-big-calendar
    const calendarEvents = await Promise.all(
      aulas.map(async (aula) => {
        const professor = await storage.getUserById(aula.professorId);
        const student = await storage.getLeadById(aula.studentId);

        return {
          ...aula,
          title: `${aula.service} - ${student?.name || 'Aluno'}`,
          start: new Date(aula.startTime),
          end: new Date(aula.endTime),
          resource: {
            professor: professor ? { id: professor.id, name: professor.name } : null,
            student: student ? { id: student.id, name: student.name } : null,
            originalData: aula
          }
        };
      })
    );

    res.json(calendarEvents);
  } catch (error) {
    console.error("Erro ao buscar aulas:", error);
    res.status(500).json({ message: "Erro ao buscar aulas" });
  }
};

/**
 * Atualizar uma aula específica
 */
export const updateClass = async (req: Request, res: Response) => {
  try {
    const aulaId = parseInt(req.params.id);
    if (isNaN(aulaId)) {
      return res.status(400).json({ message: "ID da aula inválido" });
    }

    // Validar dados (schema parcial)
    const updateSchema = aulaValidationSchema.partial();
    const validatedData = updateSchema.parse(req.body);

    // Verificar se a aula existe
    const existingAula = await storage.getAulaById(aulaId);
    if (!existingAula) {
      return res.status(404).json({ message: "Aula não encontrada" });
    }

    // Se horário está sendo alterado, verificar conflitos
    if (validatedData.startTime || validatedData.endTime) {
      const startTime = validatedData.startTime ? new Date(validatedData.startTime as any) : new Date(existingAula.startTime);
      const endTime = validatedData.endTime ? new Date(validatedData.endTime as any) : new Date(existingAula.endTime);
      const professorId = validatedData.professorId || existingAula.professorId;
      const studentId = validatedData.studentId || existingAula.studentId;

      const hasConflict = await storage.checkSchedulingConflicts(
        professorId,
        studentId,
        startTime,
        endTime,
        aulaId // Excluir a própria aula da verificação
      );

      if (hasConflict) {
        return res.status(409).json({
          message: "Conflito de horário detectado",
          conflict: hasConflict
        });
      }

      // Marcar como modificada se horário mudou
      if (validatedData.startTime || validatedData.endTime) {
        validatedData.isModified = true;
        if (!existingAula.originalStartTime) {
          validatedData.originalStartTime = existingAula.startTime;
          validatedData.originalEndTime = existingAula.endTime;
        }
      }
    }

    const updatedAula = await storage.updateAula(aulaId, validatedData);
    res.json(updatedAula);
  } catch (error) {
    if (error instanceof ZodError) {
      return res.status(400).json({
        message: "Dados inválidos",
        errors: error.errors.map(err => ({
          field: err.path.join("."),
          message: err.message
        }))
      });
    }
    console.error("Erro ao atualizar aula:", error);
    res.status(500).json({ message: "Erro ao atualizar aula" });
  }
};

/**
 * Verificar conflitos de horário
 */
export const checkConflicts = async (req: Request, res: Response) => {
  try {
    const { professorId, studentId, startTime, endTime, excludeAulaId } = req.body;

    if (!professorId || !studentId || !startTime || !endTime) {
      return res.status(400).json({ message: "Dados obrigatórios não fornecidos" });
    }

    const hasConflict = await storage.checkSchedulingConflicts(
      parseInt(professorId),
      parseInt(studentId),
      new Date(startTime),
      new Date(endTime),
      excludeAulaId ? parseInt(excludeAulaId) : undefined
    );

    res.json({
      hasConflict: !!hasConflict,
      conflict: hasConflict
    });
  } catch (error) {
    console.error("Erro ao verificar conflitos:", error);
    res.status(500).json({ message: "Erro ao verificar conflitos" });
  }
};

/**
 * Função auxiliar para gerar aulas recorrentes
 */
async function generateRecurrentClasses(agendamento: any): Promise<any[]> {
  const aulas = [];
  const { regras } = agendamento;
  const startDate = new Date(agendamento.startDate);
  const endDate = agendamento.endDate ? new Date(agendamento.endDate) : null;
  const maxDate = new Date();
  maxDate.setMonth(maxDate.getMonth() + 6); // 6 meses à frente

  let currentDate = new Date(startDate);
  let occurrenceCount = 0;

  while (currentDate <= maxDate) {
    // Verificar se atingiu limite de ocorrências
    if (agendamento.maxOccurrences && occurrenceCount >= agendamento.maxOccurrences) {
      break;
    }

    // Verificar se atingiu data limite
    if (endDate && currentDate > endDate) {
      break;
    }

    // Verificar se o dia da semana está nas regras (para recorrência semanal)
    if (regras.type === 'weekly' && regras.weekDays) {
      const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
      const currentDayName = dayNames[currentDate.getDay()];
      if (!regras.weekDays.includes(currentDayName)) {
        currentDate.setDate(currentDate.getDate() + 1);
        continue;
      }
    }

    // Criar aula para esta data
    const startTime = new Date(currentDate);
    const endTime = new Date(currentDate);
    
    // Definir horários baseados na primeira aula
    const originalStartTime = new Date(startDate);
    const originalEndTime = new Date(startDate);
    originalEndTime.setHours(originalStartTime.getHours() + 1); // Duração padrão de 1 hora

    startTime.setHours(originalStartTime.getHours(), originalStartTime.getMinutes());
    endTime.setHours(originalEndTime.getHours(), originalEndTime.getMinutes());

    aulas.push({
      agendamentoRecorrenteId: agendamento.id,
      professorId: agendamento.professorId,
      studentId: agendamento.studentId,
      startTime: startTime.toISOString(),
      endTime: endTime.toISOString(),
      location: agendamento.location,
      value: agendamento.value,
      service: agendamento.service,
      notes: agendamento.notes,
      status: "agendado" as const,
      isModified: false
    });

    occurrenceCount++;

    // Avançar para próxima ocorrência baseado no tipo de recorrência
    switch (regras.type) {
      case 'daily':
        currentDate.setDate(currentDate.getDate() + regras.interval);
        break;
      case 'weekly':
        currentDate.setDate(currentDate.getDate() + (7 * regras.interval));
        break;
      case 'monthly':
        currentDate.setMonth(currentDate.getMonth() + regras.interval);
        break;
      case 'yearly':
        currentDate.setFullYear(currentDate.getFullYear() + regras.interval);
        break;
      default:
        currentDate.setDate(currentDate.getDate() + 1);
    }
  }

  return aulas;
}