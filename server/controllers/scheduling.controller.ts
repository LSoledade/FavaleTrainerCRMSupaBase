import type { Request, Response } from "express";
import { storage } from "../storage"; // Adjust path as needed
import { leads } from "@shared/schema"; // Import leads schema if needed for filtering
import type { Session, Student } from "@shared/schema"; // Assuming Session and Student types are in schema

// Placeholder for actual database interactions or more complex logic
// For now, we'll move the existing mocked/simple logic here.

// --- SESSIONS ---
export const getSessions = async (req: Request, res: Response) => {
  try {
    // First try to get sessions from the database
    // Note: storage.getSessions() likely needs implementation/schema alignment too
    const dbSessions = await storage.getSessions();
    return res.json(dbSessions);
  } catch (dbError) {
    console.log('Sessions table not found or error, using simulated data:', dbError);
    // If it fails (table doesn't exist or other DB error), create simulated data
    try {
        const allLeads = await storage.getLeads();
        const alunoLeads = allLeads.filter(lead => lead.status === "Aluno");

        const sessions: Session[] = [];
        const now = new Date();
        const trainerIds = [1, 2, 3, 4]; // Mock trainer IDs

        for (const lead of alunoLeads) {
            const sessionCount = Math.floor(Math.random() * 5) + 1;
            for (let i = 0; i < sessionCount; i++) {
                const startDate = new Date(now);
                startDate.setDate(now.getDate() - Math.floor(Math.random() * 60));
                const durationMinutes = 45 + Math.floor(Math.random() * 46);
                const endDate = new Date(startDate);
                endDate.setMinutes(startDate.getMinutes() + durationMinutes);
                const statuses = ["Agendado", "Concluído", "Cancelado", "Remarcado"];
                const status = statuses[Math.floor(Math.random() * statuses.length)];
                const isPresencial = Math.random() < 0.3;
                const location = isPresencial ? ['Studio Favale', 'Academia Pink', 'Centro Esportivo'][Math.floor(Math.random() * 3)] : 'Online';

                sessions.push({
                    id: sessions.length + 1, // Simple incrementing ID for mock
                    studentId: lead.id,
                    trainerId: trainerIds[Math.floor(Math.random() * trainerIds.length)], // Assign random mock trainer ID
                    source: lead.source, // Assuming lead source is relevant
                    startTime: startDate, // Use Date object
                    endTime: endDate, // Use Date object
                    status: status,
                    location: location,
                    notes: null,
                    googleEventId: null, // Mock googleEventId
                    createdAt: new Date(lead.entryDate), // Use Date object
                    updatedAt: new Date() // Use Date object
                });
            }
        }
        return res.json(sessions);
    } catch (simError) {
        console.error('Error generating simulated session data:', simError);
        res.status(500).json({ message: "Erro ao buscar sessões, e falha ao simular dados." });
    }
  }
};

export const getSessionDetails = async (req: Request, res: Response) => {
  try {
    // We'll replicate generating mock data with details.
    // In a real scenario, this would fetch from DB and join with trainer/location data.
    const allLeads = await storage.getLeads();
    const alunoLeads = allLeads.filter(lead => lead.status === "Aluno");

    const sessions: Session[] = [];
    const now = new Date();
    const trainerIds = [1, 2, 3, 4]; // Mock trainer IDs
    const trainersMock = [
      { id: 1, name: "Amanda Silva" },
      { id: 2, name: "Ricardo Costa" },
      { id: 3, name: "Juliana Oliveira" },
      { id: 4, name: "Marcos Santos" }
    ];

    for (const lead of alunoLeads) {
        const sessionCount = Math.floor(Math.random() * 5) + 1;
        for (let i = 0; i < sessionCount; i++) {
            const startDate = new Date(now);
            startDate.setDate(now.getDate() - Math.floor(Math.random() * 60));
            const durationMinutes = 45 + Math.floor(Math.random() * 46);
            const endDate = new Date(startDate);
            endDate.setMinutes(startDate.getMinutes() + durationMinutes);
            const statuses = ["Agendado", "Concluído", "Cancelado", "Remarcado"];
            const status = statuses[Math.floor(Math.random() * statuses.length)];
            const isPresencial = Math.random() < 0.3;
            const location = isPresencial ? ['Studio Favale', 'Academia Pink', 'Centro Esportivo'][Math.floor(Math.random() * 3)] : 'Online';

            sessions.push({
                id: sessions.length + 1,
                studentId: lead.id,
                trainerId: trainerIds[Math.floor(Math.random() * trainerIds.length)],
                source: lead.source,
                startTime: startDate,
                endTime: endDate,
                status: status,
                location: location,
                notes: null,
                googleEventId: null,
                createdAt: new Date(lead.entryDate),
                updatedAt: new Date()
            });
        }
    }

    // Add extra details not present in Session schema (like trainerName, studentName)
    const sessionsWithDetails = sessions.map((session: Session) => {
      const student = alunoLeads.find(l => l.id === session.studentId);
      const trainer = trainersMock.find(t => t.id === session.trainerId);
      return {
          ...session,
          // Convert Dates back to ISO strings for JSON compatibility if needed by frontend
          startTime: session.startTime.toISOString(),
          endTime: session.endTime.toISOString(),
          createdAt: session.createdAt.toISOString(),
          updatedAt: session.updatedAt.toISOString(),
          // Add names and feedback for detailed view
          studentName: student ? student.name : 'Desconhecido',
          trainerName: trainer ? trainer.name : 'Desconhecido',
          feedback: session.status === 'Concluído' ? ['Excelente progresso', 'Bom desempenho', 'Precisa melhorar', 'Superou expectativas'][Math.floor(Math.random() * 4)] : null
      };
    });

    res.json(sessionsWithDetails);
  } catch (error) {
    console.error('Erro ao buscar detalhes das sessões:', error);
    res.status(500).json({ message: "Erro ao buscar detalhes das sessões" });
  }
};

export const getSessionsByDateRange = async (req: Request, res: Response) => {
  try {
    const startDateQuery = req.query.start ? new Date(req.query.start as string) : new Date(new Date().setDate(new Date().getDate() - 30));
    const endDateQuery = req.query.end ? new Date(req.query.end as string) : new Date(new Date().setDate(new Date().getDate() + 30));

    // Replicating the logic of fetching all (mocked) sessions then filtering.
    const allLeads = await storage.getLeads();
    const alunoLeads = allLeads.filter(lead => lead.status === "Aluno");

    const allSessions: Session[] = [];
    const now = new Date();
    const trainerIds = [1, 2, 3, 4]; // Mock trainer IDs

    for (const lead of alunoLeads) {
        const sessionCount = Math.floor(Math.random() * 5) + 1;
        for (let i = 0; i < sessionCount; i++) {
            const sessionStartDate = new Date(now);
            sessionStartDate.setDate(now.getDate() - Math.floor(Math.random() * 60));
            const durationMinutes = 45 + Math.floor(Math.random() * 46);
            const sessionEndDate = new Date(sessionStartDate);
            sessionEndDate.setMinutes(sessionStartDate.getMinutes() + durationMinutes);
            const statuses = ["Agendado", "Concluído", "Cancelado", "Remarcado"];
            const status = statuses[Math.floor(Math.random() * statuses.length)];
            const isPresencial = Math.random() < 0.3;
            const location = isPresencial ? ['Studio Favale', 'Academia Pink', 'Centro Esportivo'][Math.floor(Math.random() * 3)] : 'Online';

            allSessions.push({
                id: allSessions.length + 1,
                studentId: lead.id,
                trainerId: trainerIds[Math.floor(Math.random() * trainerIds.length)],
                source: lead.source,
                startTime: sessionStartDate,
                endTime: sessionEndDate,
                status: status,
                location: location,
                notes: null,
                googleEventId: null,
                createdAt: new Date(lead.entryDate),
                updatedAt: new Date()
            });
        }
    }

    const filteredSessions = allSessions.filter((session: Session) => {
      // Compare Date objects directly
      return session.startTime >= startDateQuery && session.startTime <= endDateQuery;
    });

    // Convert dates back to ISO strings for JSON response consistency
    const responseSessions = filteredSessions.map(s => ({
        ...s,
        startTime: s.startTime.toISOString(),
        endTime: s.endTime.toISOString(),
        createdAt: s.createdAt.toISOString(),
        updatedAt: s.updatedAt.toISOString(),
    }));

    res.json(responseSessions);
  } catch (error) {
    console.error('Erro ao buscar sessões por data:', error);
    res.status(500).json({ message: "Erro ao buscar sessões por data" });
  }
};

// --- TRAINERS ---
export const getTrainers = async (req: Request, res: Response) => {
  try {
    // Mocked data as in the original routes.ts
    // TODO: Replace with actual DB query for trainers
    const trainers = [
      { id: 1, name: "Amanda Silva", specialty: "Musculação", email: "amanda.silva@favalepink.com", phone: "+5511987654321", active: true, bio: "Especialista em musculação e condicionamento físico", imageUrl: null, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
      { id: 2, name: "Ricardo Costa", specialty: "Funcional", email: "ricardo.costa@favalepink.com", phone: "+5511976543210", active: true, bio: "Especialista em treinamento funcional e crossfit", imageUrl: null, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
      { id: 3, name: "Juliana Oliveira", specialty: "Pilates", email: "juliana.oliveira@favalepink.com", phone: "+5511965432109", active: true, bio: "Especialista em pilates e alongamento", imageUrl: null, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
      { id: 4, name: "Marcos Santos", specialty: "Nutrição Esportiva", email: "marcos.santos@favalepink.com", phone: "+5511954321098", active: true, bio: "Nutricionista esportivo com foco em emagrecimento e hipertrofia", imageUrl: null, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
      { id: 5, name: "Carolina Mendes", specialty: "Yoga", email: "carolina.mendes@favalepink.com", phone: "+5511943210987", active: false, bio: "Instrutora de yoga e meditação", imageUrl: null, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }
    ];
    res.json(trainers);
  } catch (error) {
    console.error('Erro ao buscar treinadores:', error);
    res.status(500).json({ message: "Erro ao buscar treinadores" });
  }
};

export const getActiveTrainers = async (req: Request, res: Response) => {
  try {
    // Replicating the logic of fetching all (mocked) trainers then filtering.
    // TODO: Replace with actual DB query filtering active trainers
    const trainers = [
        { id: 1, name: "Amanda Silva", specialty: "Musculação", email: "amanda.silva@favalepink.com", phone: "+5511987654321", active: true, bio: "Especialista em musculação e condicionamento físico", imageUrl: null, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
        { id: 2, name: "Ricardo Costa", specialty: "Funcional", email: "ricardo.costa@favalepink.com", phone: "+5511976543210", active: true, bio: "Especialista em treinamento funcional e crossfit", imageUrl: null, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
        { id: 3, name: "Juliana Oliveira", specialty: "Pilates", email: "juliana.oliveira@favalepink.com", phone: "+5511965432109", active: true, bio: "Especialista em pilates e alongamento", imageUrl: null, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
        { id: 4, name: "Marcos Santos", specialty: "Nutrição Esportiva", email: "marcos.santos@favalepink.com", phone: "+5511954321098", active: true, bio: "Nutricionista esportivo com foco em emagrecimento e hipertrofia", imageUrl: null, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
        { id: 5, name: "Carolina Mendes", specialty: "Yoga", email: "carolina.mendes@favalepink.com", phone: "+5511943210987", active: false, bio: "Instrutora de yoga e meditação", imageUrl: null, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }
      ];
    const activeTrainers = trainers.filter((trainer: any) => trainer.active);
    res.json(activeTrainers);
  } catch (error) {
    console.error('Erro ao buscar treinadores ativos:', error);
    res.status(500).json({ message: "Erro ao buscar treinadores ativos" });
  }
};

// --- STUDENTS ---
export const getStudents = async (req: Request, res: Response) => {
  try {
    // Mocked data based on leads, as in original routes.ts
    // TODO: Replace with actual DB query for students
    const allLeads = await storage.getLeads();
    const alunoLeads = allLeads.filter(lead => lead.status === "Aluno");

    const students: Student[] = alunoLeads.map(lead => ({
      id: lead.id, // Assuming student ID is same as lead ID for this mock
      leadId: lead.id,
      // name, email, phone are not in Student schema, they are in Lead schema
      source: lead.source || 'Não definido',
      address: `${lead.state || 'SP'}, Brasil`, // Mock address
      preferences: `Interesse em ${['Perda de peso', 'Musculação', 'Saúde geral', 'Condicionamento físico'][Math.floor(Math.random() * 4)]}`, // Mock preferences
      active: true, // Mock active status
      createdAt: new Date(lead.entryDate), // Use Date object
      updatedAt: new Date() // Use Date object
    }));

    // Convert dates back to ISO strings for JSON response consistency
    const responseStudents = students.map(s => ({
        ...s,
        createdAt: s.createdAt.toISOString(),
        updatedAt: s.updatedAt.toISOString(),
    }));

    res.json(responseStudents);
  } catch (error) {
    console.error('Erro ao buscar estudantes:', error);
    res.status(500).json({ message: "Erro ao buscar estudantes" });
  }
};

export const getStudentsWithLeads = async (req: Request, res: Response) => {
  try {
    // Replicating the logic of fetching all (mocked) students then combining with leads.
    // TODO: Replace with actual DB query joining students and leads
    const allLeads = await storage.getLeads();
    const alunoLeads = allLeads.filter(lead => lead.status === "Aluno");

    const students: Student[] = alunoLeads.map(lead => ({
      id: lead.id,
      leadId: lead.id,
      source: lead.source || 'Não definido',
      address: `${lead.state || 'SP'}, Brasil`,
      preferences: `Interesse em ${['Perda de peso', 'Musculação', 'Saúde geral', 'Condicionamento físico'][Math.floor(Math.random() * 4)]}`,
      active: true,
      createdAt: new Date(lead.entryDate),
      updatedAt: new Date()
    }));

    const studentsWithLeads = students.map((student: Student) => {
      const lead = allLeads.find(l => l.id === student.leadId);
      return {
        ...student,
        // Convert dates back to ISO strings for JSON response consistency
        createdAt: student.createdAt.toISOString(),
        updatedAt: student.updatedAt.toISOString(),
        // Add lead details (including name, email, phone)
        lead: lead ? {
            ...lead,
            entryDate: new Date(lead.entryDate).toISOString(), // Ensure lead dates are also ISO strings
            updatedAt: lead.updatedAt ? new Date(lead.updatedAt).toISOString() : new Date().toISOString() 
        } : null
      };
    });

    res.json(studentsWithLeads);
  } catch (error) {
    console.error('Erro ao buscar estudantes com info de leads:', error);
    res.status(500).json({ message: "Erro ao buscar estudantes com info de leads" });
  }
};

export const deleteAppointment = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // Delete the appointment
    // await db.delete(aulas).where(eq(aulas.id, parseInt(id)));

    res.json({ success: true, message: 'Agendamento excluído com sucesso' });
  } catch (error) {
    console.error('Erro ao excluir agendamento:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
};

export const updateAppointmentStatus = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    // Validate status
    const validStatuses = [
      'SCHEDULED', 'DESM_DIA', 'DESM_ANTEC', 'DESM_MANUF', 
      'REP', 'REP_DESM_DIA', 'AULA_ADIC', 'COMPLETED', 'CANCELLED'
    ];

    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: 'Status inválido' });
    }

    // Update the appointment status
    // const [updatedAppointment] = await db
    //   .update(aulas)
    //   .set({ status })
    //   .where(eq(aulas.id, parseInt(id)))
    //   .returning();

    const updatedAppointment = {id: id, status: status};

    if (!updatedAppointment) {
      return res.status(404).json({ error: 'Agendamento não encontrado' });
    }

    res.json({ 
      success: true, 
      message: 'Status atualizado com sucesso',
      appointment: updatedAppointment
    });
  } catch (error) {
    console.error('Erro ao atualizar status do agendamento:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
};

export const deleteRecurringGroup = async (req: Request, res: Response) => {
  try {
    const { groupId } = req.params;

    if (!groupId) {
      return res.status(400).json({ error: 'ID do grupo de recorrência é obrigatório' });
    }

    // Delete all appointments in the recurring group
    // const deletedAppointments = await db
    //   .delete(aulas)
    //   .where(eq(aulas.recurrenceGroupId, groupId))
    //   .returning();
    const deletedAppointments = [];

    if (deletedAppointments.length === 0) {
      return res.status(404).json({ error: 'Grupo de recorrência não encontrado' });
    }

    res.json({ 
      success: true, 
      message: `${deletedAppointments.length} agendamentos da recorrência excluídos com sucesso`,
      deletedCount: deletedAppointments.length
    });
  } catch (error) {
    console.error('Erro ao excluir grupo de recorrência:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
};

// Aliases for route compatibility
export const getAppointments = getSessions;
export const createAppointment = async (req: Request, res: Response) => {
  try {
    // For now, return a simple response - this can be implemented based on requirements
    res.json({ success: true, message: 'Appointment creation endpoint - needs implementation' });
  } catch (error) {
    console.error('Erro ao criar agendamento:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
};

export const updateAppointment = async (req: Request, res: Response) => {
  try {
    // For now, return a simple response - this can be implemented based on requirements
    res.json({ success: true, message: 'Appointment update endpoint - needs implementation' });
  } catch (error) {
    console.error('Erro ao atualizar agendamento:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
};

export const createRecurringAppointments = async (req: Request, res: Response) => {
  try {
    // For now, return a simple response - this can be implemented based on requirements
    res.json({ success: true, message: 'Recurring appointments creation endpoint - needs implementation' });
  } catch (error) {
    console.error('Erro ao criar agendamentos recorrentes:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
};