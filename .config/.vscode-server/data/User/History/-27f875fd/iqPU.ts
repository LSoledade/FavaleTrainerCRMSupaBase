import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage, type IStorage } from "./storage";
import { db } from "./db";
import { 
  leads, sessions, users, aulas, agendamentosRecorrentes, services,
  insertLeadSchema, leadValidationSchema, whatsappMessageValidationSchema,
  taskValidationSchema, taskCommentValidationSchema,
  type Session, type Student, type WhatsappMessage
} from "@shared/schema";
import * as schema from "@shared/schema";
import { eq, desc, and, or, like, isNull, isNotNull, count, sql as drizzleSql, inArray, gte, lte } from "drizzle-orm";
import { randomUUID } from "crypto";
import { fromZodError } from "zod-validation-error";
import { setupAuth } from "./auth";
import { logAuditEvent, AuditEventType, getRecentAuditLogs } from "./audit-log";
import { 
  sendWhatsAppMessage, 
  sendWhatsAppTemplate, 
  checkWhatsAppConnection, 
  formatPhoneNumber, 
  sendWhatsAppImage,
  getWhatsAppQRCode,
  checkMessageStatus,
  saveConfigSettings,
  getConfigSettings
} from "./whatsapp-service";
import { getWeatherByCity, checkWeatherService } from "./weather-service";
import { log } from "./vite";
import { sql } from 'drizzle-orm';

// Import new user router and middlewares
import userRouter from "./routes/user.routes";
import leadRouter from "./routes/lead.routes"; // Import lead router
import taskRouter from "./routes/task.routes"; // Import task router
import whatsappRouter from "./routes/whatsapp.routes"; // Import whatsapp router
import auditLogRouter from "./routes/auditLog.routes"; // Import auditLog router
import weatherRouter from "./routes/weather.routes"; // Import weather router
import schedulingRouter from "./routes/scheduling.routes"; // Import scheduling router
import newSchedulingRouter from "./routes/scheduling.routes"; // Import new scheduling router
import statsRouter from "./routes/stats.routes"; // Import stats router
import { isAuthenticated, isAdmin } from "./middlewares/auth.middleware"; // Import middlewares
import { addUserNamesToTasks } from "./utils/task.utils"; // Import addUserNamesToTasks
// Remover integração Google Calendar
// import oauthRoutes from './routes/oauth.routes';

export async function registerRoutes(app: Express): Promise<Server> {
  // Set up authentication routes and middleware
  setupAuth(app);

  // Use the new routers
  app.use("/api/users", userRouter);
  app.use("/api/leads", leadRouter); // Use lead router
  app.use("/api/tasks", taskRouter); // Use task router
  app.use("/api/whatsapp", whatsappRouter); // Use whatsapp router
  app.use("/api/audit-logs", auditLogRouter); // Use auditLog router
  app.use("/api/weather", weatherRouter); // Use weather router
  app.use("/api/scheduling", schedulingRouter); // Use old scheduling router
  app.use("/api/new-scheduling", newSchedulingRouter); // Use new scheduling router
  app.use("/api/stats", statsRouter); // Use stats router
  // Remover integração Google Calendar
  // app.use('/api/oauth', oauthRoutes);

  // Get all sessions
  app.get('/api/sessions', async (req, res) => {
    try {
      const result = await db.execute(sql`
        SELECT 
          id,
          start_time as "startTime",
          end_time as "endTime", 
          location,
          source,
          notes,
          status,
          lead_id as "leadId",
          trainer_id as "trainerId",
          value,
          service,
          recurrence_type as "recurrenceType",
          recurrence_interval as "recurrenceInterval",
          recurrence_week_days as "recurrenceWeekDays",
          recurrence_end_type as "recurrenceEndType",
          recurrence_end_date as "recurrenceEndDate",
          recurrence_end_count as "recurrenceEndCount",
          recurrence_group_id as "recurrenceGroupId",
          is_recurrence_parent as "isRecurrenceParent",
          parent_session_id as "parentSessionId"
        FROM sessions 
        ORDER BY start_time ASC
      `);
      
      res.json(result.rows);
    } catch (error) {
      console.error('Erro ao buscar sessões:', error);
      res.status(500).json({ message: "Erro ao buscar sessões" });
    }
  });

  // Get all trainers
  app.get('/api/trainers', async (req, res) => {
    try {
      const result = await db.execute(sql`
        SELECT id, name, email, specialties, source
        FROM trainers 
        ORDER BY name ASC
      `);
      
      res.json(result.rows);
    } catch (error) {
      console.error('Erro ao buscar professores:', error);
      res.status(500).json({ message: "Erro ao buscar professores" });
    }
  });

  // Create new session with recurrence support
  app.post('/api/sessions', async (req, res) => {
    try {
      const { 
        startTime, 
        endTime, 
        location, 
        source, 
        leadId, 
        trainerId, 
        notes, 
        status,
        value,
        service,
        recurrenceType,
        recurrenceInterval,
        recurrenceWeekDays,
        recurrenceEndType,
        recurrenceEndDate,
        recurrenceEndCount
      } = req.body;

      if (recurrenceType === 'none') {
        // Single session
        const result = await db.execute(sql`
          INSERT INTO sessions (
            start_time, end_time, location, source, lead_id, trainer_id, 
            notes, status, value, service, recurrence_type
          )
          VALUES (
            ${startTime}, ${endTime}, ${location}, ${source}, ${leadId}, ${trainerId}, 
            ${notes || null}, ${status || 'agendado'}, ${value}, ${service}, ${recurrenceType}
          )
          RETURNING id
        `);
        
        return res.json({ 
          id: result.rows[0].id, 
          message: 'Sessão criada com sucesso',
          recurring: false,
          count: 1
        });
      }

      // Generate recurring sessions
      const recurrenceGroupId = randomUUID();
      const sessions = [];
      const baseStartTime = new Date(startTime);
      const baseEndTime = new Date(endTime);
      let currentDate = new Date(baseStartTime);
      
      // Determine end condition
      const maxSessions = recurrenceEndType === 'count' ? recurrenceEndCount : 100;
      const endDate = recurrenceEndType === 'date' ? new Date(recurrenceEndDate) : null;
      
      let sessionCount = 0;
      
      while (sessionCount < maxSessions) {
        // Check if we've reached the end date
        if (endDate && currentDate > endDate) {
          break;
        }

        // For weekly recurrence, check if current day matches selected days
        if (recurrenceType === 'weekly') {
          const dayNames = ['domingo', 'segunda', 'terca', 'quarta', 'quinta', 'sexta', 'sabado'];
          const currentDayName = dayNames[currentDate.getDay()];
          
          if (recurrenceWeekDays && recurrenceWeekDays.includes(currentDayName)) {
            const sessionStart = new Date(currentDate);
            sessionStart.setHours(baseStartTime.getHours(), baseStartTime.getMinutes(), 0, 0);
            
            const sessionEnd = new Date(currentDate);
            sessionEnd.setHours(baseEndTime.getHours(), baseEndTime.getMinutes(), 0, 0);
            
            sessions.push({
              startTime: sessionStart.toISOString(),
              endTime: sessionEnd.toISOString(),
              isParent: sessions.length === 0
            });
          }
          
          // Move to next day
          currentDate.setDate(currentDate.getDate() + 1);
          
          // After checking 7 days, jump by interval weeks
          if (currentDate.getDay() === baseStartTime.getDay()) {
            currentDate.setDate(currentDate.getDate() + (7 * (recurrenceInterval - 1)));
          }
        } else if (recurrenceType === 'daily') {
          const sessionStart = new Date(currentDate);
          sessionStart.setHours(baseStartTime.getHours(), baseStartTime.getMinutes(), 0, 0);
          
          const sessionEnd = new Date(currentDate);
          sessionEnd.setHours(baseEndTime.getHours(), baseEndTime.getMinutes(), 0, 0);
          
          sessions.push({
            startTime: sessionStart.toISOString(),
            endTime: sessionEnd.toISOString(),
            isParent: sessions.length === 0
          });
          
          currentDate.setDate(currentDate.getDate() + recurrenceInterval);
        } else if (recurrenceType === 'monthly') {
          const sessionStart = new Date(currentDate);
          sessionStart.setHours(baseStartTime.getHours(), baseStartTime.getMinutes(), 0, 0);
          
          const sessionEnd = new Date(currentDate);
          sessionEnd.setHours(baseEndTime.getHours(), baseEndTime.getMinutes(), 0, 0);
          
          sessions.push({
            startTime: sessionStart.toISOString(),
            endTime: sessionEnd.toISOString(),
            isParent: sessions.length === 0
          });
          
          currentDate.setMonth(currentDate.getMonth() + recurrenceInterval);
        }
        
        sessionCount++;
        
        // Safety check to prevent infinite loops
        if (sessionCount > 365) break;
      }

      // Insert all sessions using SQL
      let parentSessionId = null;
      const insertedSessions = [];

      for (const session of sessions) {
        const result = await db.execute(sql`
          INSERT INTO sessions (
            start_time, end_time, location, source, lead_id, trainer_id, 
            notes, status, value, service, recurrence_type, recurrence_interval,
            recurrence_week_days, recurrence_end_type, recurrence_end_date, 
            recurrence_end_count, recurrence_group_id, is_recurrence_parent,
            parent_session_id
          )
          VALUES (
            ${session.startTime}, ${session.endTime}, ${location}, ${source}, 
            ${leadId}, ${trainerId}, ${notes}, ${status || 'agendado'}, 
            ${value}, ${service}, ${recurrenceType}, ${recurrenceInterval},
            ${recurrenceWeekDays ? JSON.stringify(recurrenceWeekDays) : null}, ${recurrenceEndType}, ${recurrenceEndDate}, 
            ${recurrenceEndCount}, ${recurrenceGroupId}, ${session.isParent},
            ${parentSessionId}
          )
          RETURNING id
        `);
        
        const sessionId = result.rows[0].id;
        insertedSessions.push(sessionId);
        
        if (session.isParent) {
          parentSessionId = sessionId;
        }
      }

      res.json({ 
        message: 'Sessões criadas com sucesso',
        recurring: true,
        count: insertedSessions.length,
        parentId: parentSessionId,
        groupId: recurrenceGroupId
      });
    } catch (error) {
      console.error('Erro ao criar sessão:', error);
      res.status(500).json({ message: "Erro ao criar sessão" });
    }
  });

  // Update session
  app.patch('/api/sessions/:id', async (req, res) => {
    try {
      const sessionId = parseInt(req.params.id);
      const updates = req.body;
      
      // Build dynamic update query
      const updateFields = [];
      const values = [];
      
      if (updates.startTime) {
        updateFields.push('start_time = $' + (values.length + 1));
        values.push(updates.startTime);
      }
      if (updates.endTime) {
        updateFields.push('end_time = $' + (values.length + 1));
        values.push(updates.endTime);
      }
      if (updates.location) {
        updateFields.push('location = $' + (values.length + 1));
        values.push(updates.location);
      }
      if (updates.status) {
        updateFields.push('status = $' + (values.length + 1));
        values.push(updates.status);
      }
      if (updates.notes !== undefined) {
        updateFields.push('notes = $' + (values.length + 1));
        values.push(updates.notes);
      }
      
      if (updateFields.length === 0) {
        return res.status(400).json({ message: 'Nenhum campo para atualizar' });
      }
      
      updateFields.push('updated_at = NOW()');
      values.push(sessionId);
      
      const query = `UPDATE sessions SET ${updateFields.join(', ')} WHERE id = $${values.length}`;
      
      await db.execute(sql.raw(query, values));
      
      res.json({ message: 'Sessão atualizada com sucesso' });
    } catch (error) {
      console.error('Erro ao atualizar sessão:', error);
      res.status(500).json({ message: "Erro ao atualizar sessão" });
    }
  });

  // Get all leads
  app.get('/api/leads', async (req, res) => {
    try {
      const leads = await storage.getLeads();
      res.json(leads);
    } catch (error) {
      res.status(500).json({ message: "Erro ao buscar leads" });
    }
  });

  // Get lead by ID
  app.get('/api/leads/:id', async (req, res) => {
    try {
      const leadId = parseInt(req.params.id);
      const lead = await storage.getLead(leadId);

      if (!lead) {
        return res.status(404).json({ message: "Lead não encontrado" });
      }

      res.json(lead);
    } catch (error) {
      res.status(500).json({ message: "Erro ao buscar lead" });
    }
  });

  // Create new lead
  app.post('/api/leads', async (req, res) => {
    try {
      console.log('Recebendo dados para criar lead:', req.body);

      // Primeiro validamos com o schema que aceita data como string (para validar formato)
      const validationResult = leadValidationSchema.safeParse(req.body);

      if (!validationResult.success) {
        const validationError = fromZodError(validationResult.error);
        console.error('Erro de validação:', validationError.message);
        return res.status(400).json({ message: validationError.message });
      }

      console.log('Dados validados:', validationResult.data);

      // Garantir que entryDate seja um objeto Date antes de enviar para o banco
      const leadToInsert = {
        ...validationResult.data,
        entryDate: validationResult.data.entryDate instanceof Date 
          ? validationResult.data.entryDate 
          : new Date(validationResult.data.entryDate)
      };

      console.log('Dados convertidos para inserção:', leadToInsert);
      const newLead = await storage.createLead(leadToInsert);

      // Registrar evento de criação de lead
      logAuditEvent(AuditEventType.LEAD_CREATED, req, {
        leadId: newLead.id,
        name: newLead.name,
        source: newLead.source,
        status: newLead.status
      });

      res.status(201).json(newLead);
    } catch (error) {
      console.error('Erro ao criar lead:', error);
      res.status(500).json({ message: "Erro ao criar lead", details: String(error) });
    }
  });

  // Update lead
  app.patch('/api/leads/:id', async (req, res) => {
    try {
      const leadId = parseInt(req.params.id);
      console.log('Atualizando lead:', req.body);

      // Validar os dados recebidos
      const validationResult = leadValidationSchema.partial().safeParse(req.body);

      if (!validationResult.success) {
        const validationError = fromZodError(validationResult.error);
        console.error('Erro de validação na atualização:', validationError.message);
        return res.status(400).json({ message: validationError.message });
      }

      // Preparar os dados para atualização
      let dataToUpdate = validationResult.data;

      // Se entryDate for uma string, converter para Date
      if (dataToUpdate.entryDate && typeof dataToUpdate.entryDate === 'string') {
        try {
          dataToUpdate = {
            ...dataToUpdate,
            entryDate: new Date(dataToUpdate.entryDate)
          };
        } catch (e) {
          console.error('Erro ao converter data:', e);
          return res.status(400).json({ message: "Formato de data inválido" });
        }
      }

      console.log('Dados para atualização:', dataToUpdate);
      const updatedLead = await storage.updateLead(leadId, dataToUpdate);

      if (!updatedLead) {
        return res.status(404).json({ message: "Lead não encontrado" });
      }

      // Registrar evento de atualização de lead
      logAuditEvent(AuditEventType.LEAD_UPDATED, req, {
        leadId: updatedLead.id,
        name: updatedLead.name,
        updatedFields: Object.keys(dataToUpdate),
        statusChange: dataToUpdate.status ? `${updatedLead.status !== dataToUpdate.status ? 'De ' + updatedLead.status + ' para ' + dataToUpdate.status : 'Sem alteração'}` : undefined
      });

      res.json(updatedLead);
    } catch (error) {
      console.error('Erro ao atualizar lead:', error);
      res.status(500).json({ message: "Erro ao atualizar lead", details: String(error) });
    }
  });

  // Delete lead
  app.delete('/api/leads/:id', async (req, res) => {
    try {
      const leadId = parseInt(req.params.id);

      // Obter informações do lead antes de excluir (para o log de auditoria)
      const leadToDelete = await storage.getLead(leadId);

      if (!leadToDelete) {
        return res.status(404).json({ message: "Lead não encontrado" });
      }

      const success = await storage.deleteLead(leadId);

      if (!success) {
        return res.status(404).json({ message: "Lead não encontrado" });
      }

      // Registrar evento de exclusão de lead
      logAuditEvent(AuditEventType.LEAD_DELETED, req, {
        leadId: leadId,
        name: leadToDelete.name,
        email: leadToDelete.email,
        source: leadToDelete.source,
        status: leadToDelete.status
      });

      res.status(204).send();
    } catch (error) {
      console.error('Erro ao deletar lead:', error);
      res.status(500).json({ message: "Erro ao deletar lead" });
    }
  });

  // Get all trainers
  app.get('/api/trainers', async (req, res) => {
    try {
      const trainersResult = await db.execute(sql`
        SELECT id, name, email, source, active, specialties, phone
        FROM trainers 
        WHERE active = true
        ORDER BY source, name
      `);
      
      res.json(trainersResult.rows);
    } catch (error) {
      console.error('Erro ao buscar professores:', error);
      res.status(500).json({ message: "Erro ao buscar professores" });
    }
  });

  // Check session conflicts
  app.post('/api/sessions/check-conflicts', async (req, res) => {
    try {
      const { trainerId, date, startTime, endTime } = req.body;
      
      if (!trainerId || !date || !startTime || !endTime) {
        return res.status(400).json({ message: "Parâmetros obrigatórios não fornecidos" });
      }

      const startDateTime = new Date(`${date}T${startTime}`);
      const endDateTime = new Date(`${date}T${endTime}`);
      
      // Adicionar 15 minutos de tolerância
      const toleranceStart = new Date(startDateTime.getTime() - 15 * 60000);
      const toleranceEnd = new Date(endDateTime.getTime() + 15 * 60000);

      // Verificar conflitos com sessões existentes
      const conflictsResult = await db.execute(sql`
        SELECT s.*, l.name as student_name
        FROM sessions s
        JOIN leads l ON s.lead_id = l.id
        WHERE s.trainer_id = ${trainerId}
        AND s.status = 'agendado'
        AND DATE(s.start_time) = ${date}
        AND (
          (s.start_time BETWEEN ${toleranceStart.toISOString()} AND ${toleranceEnd.toISOString()})
          OR 
          (s.end_time BETWEEN ${toleranceStart.toISOString()} AND ${toleranceEnd.toISOString()})
          OR
          (s.start_time <= ${startDateTime.toISOString()} AND s.end_time >= ${endDateTime.toISOString()})
        )
      `);

      const conflicts = [];
      
      if (conflictsResult.rows.length > 0) {
        for (const conflict of conflictsResult.rows) {
          const conflictRow = conflict as any;
          conflicts.push({
            type: 'trainer_busy',
            message: `Professor já tem sessão agendada com ${conflictRow.student_name} das ${new Date(conflictRow.start_time as string).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })} às ${new Date(conflictRow.end_time as string).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`,
            suggestion: 'Considere agendar 15 minutos antes ou depois do horário conflitante.'
          });
        }
      }

      // Sugerir horários alternativos se houver conflitos
      if (conflicts.length > 0) {
        const suggestedTimes = [];
        const timeSlots = [
          "06:00", "06:30", "07:00", "07:30", "08:00", "08:30", 
          "09:00", "09:30", "10:00", "10:30", "11:00", "11:30",
          "12:00", "12:30", "13:00", "13:30", "14:00", "14:30", 
          "15:00", "15:30", "16:00", "16:30", "17:00", "17:30",
          "18:00", "18:30", "19:00", "19:30", "20:00", "20:30"
        ];

        // Verificar horários disponíveis
        for (const slot of timeSlots.slice(0, 5)) { // Limitar a 5 sugestões
          const slotStart = new Date(`${date}T${slot}`);
          const slotEnd = new Date(slotStart.getTime() + (endDateTime.getTime() - startDateTime.getTime()));
          
          const slotConflictResult = await db.execute(sql`
            SELECT COUNT(*) as count
            FROM sessions s
            WHERE s.trainer_id = ${trainerId}
            AND s.status = 'agendado'
            AND DATE(s.start_time) = ${date}
            AND (
              (s.start_time BETWEEN ${slotStart.toISOString()} AND ${slotEnd.toISOString()})
              OR 
              (s.end_time BETWEEN ${slotStart.toISOString()} AND ${slotEnd.toISOString()})
              OR
              (s.start_time <= ${slotStart.toISOString()} AND s.end_time >= ${slotEnd.toISOString()})
            )
          `);

          if (parseInt((slotConflictResult.rows[0] as any).count) === 0) {
            suggestedTimes.push({
              start: slot,
              end: slotEnd.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
            });
          }
        }

        if (suggestedTimes.length > 0) {
          conflicts.push({
            type: 'suggestion',
            message: `Horários disponíveis: ${suggestedTimes.map(t => `${t.start}-${t.end}`).join(', ')}`,
          });
        }
      }

      res.json({ conflicts });
    } catch (error) {
      console.error('Erro ao verificar conflitos:', error);
      res.status(500).json({ message: "Erro ao verificar conflitos" });
    }
  });

  // Get all sessions
  app.get('/api/sessions', async (req, res) => {
    try {
      const sessions = await storage.getSessions();
      res.json(sessions);
    } catch (error) {
      console.error('Erro ao buscar sessões:', error);
      res.status(500).json({ message: "Erro ao buscar sessões" });
    }
  });

  // Create new session
  app.post('/api/sessions', async (req, res) => {
    try {
      const sessionData = {
        ...req.body,
        startTime: new Date(req.body.startTime),
        endTime: new Date(req.body.endTime)
      };
      
      // Gerar sessões recorrentes se necessário
      if (!sessionData.isOneTime && sessionData.weeklyFrequency && sessionData.weekDays) {
        const recurrenceGroupId = sessionData.recurrenceGroupId || crypto.randomUUID();
        const sessions = [];
        
        // Gerar sessões para as próximas 4 semanas
        for (let week = 0; week < 4; week++) {
          for (const dayName of sessionData.weekDays) {
            const dayIndex = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'].indexOf(dayName);
            const sessionDate = new Date(sessionData.startTime);
            sessionDate.setDate(sessionDate.getDate() + (week * 7) + (dayIndex - sessionDate.getDay()));
            
            const endDate = new Date(sessionData.endTime);
            endDate.setDate(endDate.getDate() + (week * 7) + (dayIndex - endDate.getDay()));
            
            const session = await storage.createSession({
              ...sessionData,
              startTime: sessionDate,
              endTime: endDate,
              recurrenceGroupId,
              parentSessionId: week === 0 ? null : sessions[0]?.id || null
            });
            
            sessions.push(session);
          }
        }
        
        res.status(201).json({ sessions, message: `${sessions.length} sessões criadas com sucesso` });
      } else {
        // Sessão avulsa
        const session = await storage.createSession(sessionData);
        res.status(201).json(session);
      }
    } catch (error) {
      console.error('Erro ao criar sessão:', error);
      res.status(500).json({ message: "Erro ao criar sessão" });
    }
  });

  // Update session
  app.patch('/api/sessions/:id', async (req, res) => {
    try {
      const sessionId = parseInt(req.params.id);
      const updates = req.body;
      
      const updatedSession = await storage.updateSession(sessionId, updates);
      
      if (!updatedSession) {
        return res.status(404).json({ message: "Sessão não encontrada" });
      }
      
      res.json(updatedSession);
    } catch (error) {
      console.error('Erro ao atualizar sessão:', error);
      res.status(500).json({ message: "Erro ao atualizar sessão" });
    }
  });

  // Delete session
  app.delete('/api/sessions/:id', async (req, res) => {
    try {
      const sessionId = parseInt(req.params.id);
      const deleted = await storage.deleteSession(sessionId);
      
      if (!deleted) {
        return res.status(404).json({ message: "Sessão não encontrada" });
      }
      
      res.status(204).send();
    } catch (error) {
      console.error('Erro ao deletar sessão:', error);
      res.status(500).json({ message: "Erro ao deletar sessão" });
    }
  });

  // Simple appointments API for new scheduling system
  app.post('/api/appointments', async (req, res) => {
    try {
      const appointmentData = req.body;
      
      // Create a single appointment using the aulas table
      const aulaData = {
        professorId: appointmentData.professorId,
        studentId: appointmentData.studentId,
        startTime: new Date(appointmentData.startTime),
        endTime: new Date(appointmentData.endTime),
        location: appointmentData.location || '',
        value: appointmentData.value || 0,
        service: appointmentData.service || '',
        notes: appointmentData.notes || '',
        status: 'agendado' as const,
        isModified: false,
      };

      const [newAula] = await db.insert(aulas).values(aulaData).returning();
      
      res.status(201).json(newAula);
    } catch (error) {
      console.error('Erro ao criar agendamento:', error);
      res.status(500).json({ message: "Erro ao criar agendamento", error: error.message });
    }
  });

  // Get appointments for calendar display
  app.get('/api/appointments', async (req, res) => {
    try {
      const appointments = await db
        .select({
          id: aulas.id,
          service: aulas.service,
          startTime: aulas.startTime,
          endTime: aulas.endTime,
          location: aulas.location,
          value: aulas.value,
          notes: aulas.notes,
          status: aulas.status,
          professorId: aulas.professorId,
          studentId: aulas.studentId,
          professor: {
            id: users.id,
            name: users.name,
            username: users.username,
            email: users.email,
            specialty: users.specialty,
            bio: users.bio,
            hourlyRate: users.hourlyRate
          },
          student: {
            id: leads.id,
            name: leads.name,
            email: leads.email,
            phone: leads.phone,
            notes: leads.notes
          }
        })
        .from(aulas)
        .leftJoin(users, eq(aulas.professorId, users.id))
        .leftJoin(leads, eq(aulas.studentId, leads.id));
      
      // Format the data for the calendar
      const formattedAppointments = appointments.map(appointment => ({
        ...appointment,
        title: `${appointment.service} - ${appointment.student?.name || 'Aluno'} (${appointment.professor?.name || appointment.professor?.username || 'Professor'})`
      }));
      
      res.json(formattedAppointments);
    } catch (error) {
      console.error('Erro ao buscar agendamentos:', error);
      res.status(500).json({ message: "Erro ao buscar agendamentos" });
    }
  });

  // Helper function to generate classes from recurrence
  async function generateClassesFromRecurrence(agendamento: any) {
    const { regras, startDate, endDate, maxOccurrences } = agendamento;
    const classes = [];
    
    let currentDate = new Date(startDate);
    const endDateTime = endDate ? new Date(endDate) : null;
    let count = 0;
    
    while (true) {
      // Check if we should stop
      if (maxOccurrences && count >= maxOccurrences) break;
      if (endDateTime && currentDate > endDateTime) break;
      if (count > 100) break; // Safety limit
      
      // Calculate end time for this class (assuming 1 hour duration by default)
      const classEndTime = new Date(currentDate);
      classEndTime.setHours(classEndTime.getHours() + 1);
      
      // Create the class
      classes.push({
        agendamentoRecorrenteId: agendamento.id,
        professorId: agendamento.professorId,
        studentId: agendamento.studentId,
        startTime: new Date(currentDate),
        endTime: classEndTime,
        location: agendamento.location,
        value: agendamento.value,
        service: agendamento.service,
        notes: agendamento.notes,
        status: 'agendado',
        isModified: false
      });
      
      count++;
      
      // Calculate next occurrence based on recurrence rules
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
          // For weekly with specific days, we need more complex logic
          if (regras.type === 'weekly' && regras.weekDays) {
            // Find next occurrence based on weekDays
            let found = false;
            for (let i = 1; i <= 7; i++) {
              const testDate = new Date(currentDate);
              testDate.setDate(testDate.getDate() + i);
              const dayName = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'][testDate.getDay()];
              if (regras.weekDays.includes(dayName)) {
                currentDate = testDate;
                found = true;
                break;
              }
            }
            if (!found) break;
          } else {
            break;
          }
      }
    }
    
    // Insert all classes in batch
    if (classes.length > 0) {
      await db.insert(aulas).values(classes);
    }
    
    return classes;
  }

  // Professor routes
  app.get('/api/users/professors', async (req, res) => {
    try {
      const professors = await db.select()
        .from(users)
        .where(eq(users.role, 'professor'));
      
      res.json(professors);
    } catch (error) {
      console.error('Erro ao buscar professores:', error);
      res.status(500).json({ message: "Erro ao buscar professores" });
    }
  });

  app.post('/api/users/professors', async (req, res) => {
    try {
      const professorData = req.body;
      
      // Hash password if provided
      if (professorData.password) {
        const bcrypt = require('bcrypt');
        professorData.password = await bcrypt.hash(professorData.password, 10);
      }
      
      const [professor] = await db.insert(users)
        .values({
          ...professorData,
          role: 'professor'
        })
        .returning();
      
      res.json(professor);
    } catch (error) {
      console.error('Erro ao criar professor:', error);
      res.status(500).json({ message: "Erro ao criar professor" });
    }
  });

  app.patch('/api/users/professors/:id', async (req, res) => {
    try {
      const professorId = parseInt(req.params.id);
      const updateData = req.body;
      
      // Hash password if provided
      if (updateData.password) {
        const bcrypt = await import('bcrypt');
        updateData.password = await bcrypt.hash(updateData.password, 10);
      }
      
      const [professor] = await db.update(schema.users)
        .set(updateData)
        .where(eq(schema.users.id, professorId))
        .returning();
      
      res.json(professor);
    } catch (error) {
      console.error('Erro ao atualizar professor:', error);
      res.status(500).json({ message: "Erro ao atualizar professor" });
    }
  });

  // New scheduling routes
  app.get('/api/new-scheduling/classes', async (req, res) => {
    try {
      const { start, end, professorId, status } = req.query;
      
      let query = db.select()
        .from(schema.aulas)
        .leftJoin(schema.users, eq(schema.aulas.professorId, schema.users.id))
        .leftJoin(schema.leads, eq(schema.aulas.studentId, schema.leads.id));
      
      const conditions = [];
      
      if (start && end) {
        conditions.push(
          and(
            gte(schema.aulas.startTime, new Date(start as string)),
            lte(schema.aulas.endTime, new Date(end as string))
          )
        );
      }
      
      if (professorId && professorId !== 'all') {
        conditions.push(eq(schema.aulas.professorId, parseInt(professorId as string)));
      }
      
      if (status && status !== 'all') {
        conditions.push(eq(schema.aulas.status, status as string));
      }
      
      if (conditions.length > 0) {
        query = query.where(and(...conditions));
      }
      
      const aulas = await query;
      
      // Format the data for the frontend
      const formattedAulas = aulas.map(row => ({
        ...row.aulas,
        title: `${row.aulas?.service || 'Aula'} - ${row.leads?.name || 'Aluno'}`,
        professor: row.users,
        student: row.leads
      }));
      
      res.json(formattedAulas);
    } catch (error) {
      console.error('Erro ao buscar aulas:', error);
      res.status(500).json({ message: "Erro ao buscar aulas" });
    }
  });

  app.patch('/api/new-scheduling/classes/:id', async (req, res) => {
    try {
      const aulaId = parseInt(req.params.id);
      const updateData = req.body;
      
      const [aula] = await db.update(schema.aulas)
        .set({
          ...updateData,
          updatedAt: new Date()
        })
        .where(eq(schema.aulas.id, aulaId))
        .returning();
      
      res.json(aula);
    } catch (error) {
      console.error('Erro ao atualizar aula:', error);
      res.status(500).json({ message: "Erro ao atualizar aula" });
    }
  });

  app.post('/api/new-scheduling/recurrent', async (req, res) => {
    try {
      const {
        professorId,
        studentId,
        location,
        value,
        service,
        notes,
        regras,
        startDate,
        endDate,
        maxOccurrences,
        active = true
      } = req.body;

      // Create the recurrent schedule
      const [agendamento] = await db.insert(schema.agendamentosRecorrentes)
        .values({
          professorId,
          studentId,
          location,
          value,
          service,
          notes,
          regras,
          startDate: new Date(startDate),
          endDate: endDate ? new Date(endDate) : null,
          maxOccurrences,
          active
        })
        .returning();

      // Generate individual classes based on recurrence rules
      await generateClassesFromRecurrence(agendamento);

      res.json(agendamento);
    } catch (error) {
      console.error('Erro ao criar agendamento recorrente:', error);
      res.status(500).json({ message: "Erro ao criar agendamento recorrente" });
    }
  });

  // Check professor availability for recurring appointments
  app.post('/api/professors/availability', async (req, res) => {
    try {
      const { professorId, dayOfWeek, startTime, endTime, startDate, endDate } = req.body;

      if (!professorId || dayOfWeek === undefined || !startTime || !endTime || !startDate || !endDate) {
        return res.status(400).json({ error: 'Missing required fields' });
      }

      // Convert day of week and times to check for conflicts
      const start = new Date(`2024-01-01T${startTime}:00`);
      const end = new Date(`2024-01-01T${endTime}:00`);
      
      // Query for conflicting appointments in the date range
      const conflicts = await db.select()
        .from(aulas)
        .where(
          and(
            eq(aulas.professorId, professorId),
            gte(aulas.startTime, new Date(startDate)),
            lte(aulas.startTime, new Date(endDate)),
            eq(sql`EXTRACT(dow FROM ${aulas.startTime})`, dayOfWeek),
            or(
              and(
                lte(sql`EXTRACT(hour FROM ${aulas.startTime}) * 60 + EXTRACT(minute FROM ${aulas.startTime})`,
                    start.getHours() * 60 + start.getMinutes()),
                gte(sql`EXTRACT(hour FROM ${aulas.endTime}) * 60 + EXTRACT(minute FROM ${aulas.endTime})`,
                    start.getHours() * 60 + start.getMinutes())
              ),
              and(
                lte(sql`EXTRACT(hour FROM ${aulas.startTime}) * 60 + EXTRACT(minute FROM ${aulas.startTime})`,
                    end.getHours() * 60 + end.getMinutes()),
                gte(sql`EXTRACT(hour FROM ${aulas.endTime}) * 60 + EXTRACT(minute FROM ${aulas.endTime})`,
                    end.getHours() * 60 + end.getMinutes())
              )
            )
          )
        );

      const available = conflicts.length === 0;
      res.json({ available, conflicts: conflicts.length });

    } catch (error) {
      console.error('Error checking professor availability:', error);
      res.status(500).json({ error: 'Failed to check availability' });
    }
  });

  // Get all services
  app.get('/api/services', async (req, res) => {
    try {
      const allServices = await db.select()
        .from(services)
        .where(eq(services.active, true))
        .orderBy(services.name);

      res.json(allServices);
    } catch (error) {
      console.error('Error fetching services:', error);
      res.status(500).json({ error: 'Failed to fetch services' });
    }
  });

  // Create recurring appointments
  app.post('/api/appointments/recurring', async (req, res) => {
    try {
      const { studentName, service, location, value, notes, startDate, endDate, weeklySchedule } = req.body;

      if (!studentName || !service || !startDate || !endDate || !weeklySchedule?.length) {
        return res.status(400).json({ error: 'Missing required fields' });
      }

      // First, create or find the student
      let student = await db.select()
        .from(leads)
        .where(eq(leads.name, studentName))
        .limit(1);

      if (student.length === 0) {
        // Create new student
        const newStudent = await db.insert(leads)
          .values({
            name: studentName,
            status: 'ativo',
            source: 'agendamento_recorrente',
            entryDate: new Date()
          })
          .returning();
        student = newStudent;
      }

      const studentId = student[0].id;

      // Create recurring appointment record
      // Get the first professor from the weekly schedule
      const firstProfessorId = weeklySchedule[0]?.professorsSchedule[0]?.professorId;
      if (!firstProfessorId) {
        return res.status(400).json({ error: 'At least one professor must be selected' });
      }

      const recurringAppointment = await db.insert(agendamentosRecorrentes)
        .values({
          professorId: firstProfessorId,
          studentId,
          service,
          location: location || '',
          value: value || 0,
          notes: notes || '',
          startDate: new Date(startDate),
          endDate: new Date(endDate),
          regras: { pattern: 'weekly', weeklySchedule },
          active: true
        })
        .returning();

      const recurringId = recurringAppointment[0].id;

      // Generate individual appointments
      const appointments = [];
      const start = new Date(startDate);
      const end = new Date(endDate);

      for (let currentDate = new Date(start); currentDate <= end; currentDate.setDate(currentDate.getDate() + 1)) {
        const dayOfWeek = currentDate.getDay();
        
        // Find schedule for this day
        const daySchedule = weeklySchedule.find(schedule => schedule.dayOfWeek === dayOfWeek);
        
        if (daySchedule) {
          for (const profSchedule of daySchedule.professorsSchedule) {
            for (const timeSlot of profSchedule.timeSlots) {
              const startTime = new Date(currentDate);
              const endTime = new Date(currentDate);
              
              // Parse time slots
              const [startHour, startMin] = timeSlot.startTime.split(':').map(Number);
              const [endHour, endMin] = timeSlot.endTime.split(':').map(Number);
              
              startTime.setHours(startHour, startMin, 0, 0);
              endTime.setHours(endHour, endMin, 0, 0);

              appointments.push({
                agendamentoRecorrenteId: recurringId,
                professorId: profSchedule.professorId,
                studentId,
                startTime,
                endTime,
                location: location || '',
                value: value || 0,
                service,
                notes: notes || '',
                status: 'agendado' as const,
                isModified: false
              });
            }
          }
        }
      }

      // Insert all appointments
      if (appointments.length > 0) {
        await db.insert(aulas).values(appointments);
      }

      res.json({
        success: true,
        recurringAppointmentId: recurringId,
        appointmentsCreated: appointments.length,
        message: `${appointments.length} agendamentos criados com sucesso`
      });

    } catch (error) {
      console.error('Error creating recurring appointments:', error);
      res.status(500).json({ error: 'Failed to create recurring appointments' });
    }
  });

  const httpServer = createServer(app);

  return httpServer;
}