import { 
  leads, students, trainers, sessions, sessionHistory, whatsappMessages,
  tasks, taskComments,
  type Lead, type InsertLead, 
  type User, type InsertUser, 
  type Student, type InsertStudent,
  type Trainer, type InsertTrainer,
  type Session, type InsertSession,
  type SessionHistory, type InsertSessionHistory,
  type WhatsappMessage, type InsertWhatsappMessage,
  type Task, type InsertTask,
  type TaskComment, type InsertTaskComment,
  users,
  sessionHistory as sessionHistoryTable,
  whatsappSettings, InsertWhatsappSettings, WhatsappSettings,
  // New scheduling system imports
  agendamentosRecorrentes, aulas,
  type AgendamentoRecorrente, type InsertAgendamentoRecorrente,
  type Aula, type InsertAula
} from "@shared/schema";
import { db, sql as pgClient } from "./db";
import { eq, and, desc, asc, between, inArray, or, like, sql, SQL } from "drizzle-orm";
import session from "express-session";
import { SupabaseSessionStore } from "./supabase-session-store";
import { alias } from "drizzle-orm/pg-core";

// modify the interface with any CRUD methods
// you might need

export interface IStorage {
  // User methods
  getUser(id: number): Promise<User | undefined>;
  getUserById(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  getAllUsers(): Promise<User[]>;
  deleteUser(id: number): Promise<boolean>;
  
  // Professor methods (users with role='professor')
  getAllProfessors(): Promise<User[]>;
  createProfessor(professor: InsertUser): Promise<User>;
  updateProfessor(id: number, professor: Partial<InsertUser>): Promise<User | undefined>;
  deleteProfessor(id: number): Promise<boolean>;
  hasScheduledClasses(professorId: number): Promise<boolean>;

  // Lead methods
  getLeads(): Promise<Lead[]>;
  getLead(id: number): Promise<Lead | undefined>;
  createLead(lead: InsertLead): Promise<Lead>;
  updateLead(id: number, lead: Partial<InsertLead>): Promise<Lead | undefined>;
  deleteLead(id: number): Promise<boolean>;
  getLeadsBySource(source: string): Promise<Lead[]>;
  getLeadsByStatus(status: string): Promise<Lead[]>;
  getLeadsByCampaign(campaign: string): Promise<Lead[]>;
  getLeadsByState(state: string): Promise<Lead[]>;
  getLeadsByPhone(phone: string): Promise<Lead[]>;

  // Batch operations
  updateLeadsInBatch(ids: number[], updates: Partial<InsertLead>): Promise<number>;
  deleteLeadsInBatch(ids: number[]): Promise<number>;

  // WhatsApp methods
  getWhatsappMessages(leadId: number): Promise<WhatsappMessage[]>;
  getWhatsappMessageById(id: number): Promise<WhatsappMessage | undefined>;
  getWhatsappMessageByApiId(messageId: string): Promise<WhatsappMessage | undefined>;
  createWhatsappMessage(message: InsertWhatsappMessage): Promise<WhatsappMessage>;
  updateWhatsappMessageStatus(id: number, status: string): Promise<WhatsappMessage | undefined>;
  updateWhatsappMessageId(id: number, messageId: string): Promise<WhatsappMessage | undefined>;
  deleteWhatsappMessage(id: number): Promise<boolean>;

  // Trainer methods
  getTrainers(): Promise<Trainer[]>;
  getTrainer(id: number): Promise<Trainer | undefined>;
  createTrainer(trainer: InsertTrainer): Promise<Trainer>;
  updateTrainer(id: number, trainer: Partial<InsertTrainer>): Promise<Trainer | undefined>;
  deleteTrainer(id: number): Promise<boolean>;
  getActiveTrainers(): Promise<Trainer[]>;
  getTrainersBySpecialty(specialty: string): Promise<Trainer[]>;

  // Student methods
  getStudents(): Promise<Student[]>;
  getStudent(id: number): Promise<Student | undefined>;
  getStudentByLeadId(leadId: number): Promise<Student | undefined>;
  createStudent(student: InsertStudent): Promise<Student>;
  updateStudent(id: number, student: Partial<InsertStudent>): Promise<Student | undefined>;
  deleteStudent(id: number): Promise<boolean>;
  getActiveStudents(): Promise<Student[]>;
  getStudentsBySource(source: string): Promise<Student[]>;
  getStudentsWithLeadInfo(): Promise<(Student & { lead: Lead | null })[]>;

  // Session methods
  getSessions(): Promise<Session[]>;
  getSession(id: number): Promise<Session | undefined>;
  createSession(session: InsertSession): Promise<Session>;
  updateSession(id: number, session: Partial<InsertSession>): Promise<Session | undefined>;
  deleteSession(id: number): Promise<boolean>;
  getSessionsByStudentId(studentId: number): Promise<Session[]>;
  getSessionsByTrainerId(trainerId: number): Promise<Session[]>;
  getSessionsByDateRange(startDate: Date, endDate: Date): Promise<Session[]>;
  getSessionsByStatus(status: string): Promise<Session[]>;
  getSessionsBySource(source: string): Promise<Session[]>;
  getSessionsWithDetails(): Promise<any[]>; // Retorna sessões com dados de alunos e professores
  getCompletedSessionsByStudent(studentId: number, startDate?: Date, endDate?: Date): Promise<Session[]>;

  // Session history methods
  createSessionHistory(history: InsertSessionHistory): Promise<SessionHistory>;
  getSessionHistoryBySessionId(sessionId: number): Promise<SessionHistory[]>;

  // Task methods
  getTasks(): Promise<Task[]>;
  getTask(id: number): Promise<Task | undefined>;
  createTask(task: InsertTask): Promise<Task>;
  updateTask(id: number, task: Partial<InsertTask>): Promise<Task | undefined>;
  deleteTask(id: number): Promise<boolean>;
  getTasksByAssignedToId(userId: number): Promise<Task[]>;
  getTasksByAssignedById(userId: number): Promise<Task[]>;
  getTasksByStatus(status: string): Promise<Task[]>;
  getTasksByRelatedLeadId(leadId: number): Promise<Task[]>;

  // Task comments methods
  getTaskCommentsByTaskId(taskId: number): Promise<TaskComment[]>;
  createTaskComment(comment: InsertTaskComment): Promise<TaskComment>;
  deleteTaskComment(id: number): Promise<boolean>;

  // Session store for authentication
  sessionStore: session.Store;

  // WhatsApp Settings methods
  getWhatsappSettings(): Promise<WhatsappSettings | undefined>;
  saveWhatsappSettings(settings: InsertWhatsappSettings): Promise<WhatsappSettings>;

  // Google OAuth2 token management
  saveGoogleTokens(userId: number, tokens: {
    access_token: string;
    refresh_token?: string;
    expiry_date: number;
  }): Promise<void>;
  getGoogleTokens(userId: number): Promise<{
    access_token: string;
    refresh_token?: string;
    expiry_date: number;
  } | null>;
  deleteGoogleTokens(userId: number): Promise<void>;

  // New Scheduling System methods
  // Agendamentos Recorrentes
  createAgendamentoRecorrente(agendamento: any): Promise<any>;
  getAgendamentosRecorrentes(): Promise<any[]>;
  updateAgendamentoRecorrente(id: number, agendamento: any): Promise<any>;
  deleteAgendamentoRecorrente(id: number): Promise<boolean>;

  // Aulas (individual class instances)
  getAulas(filters?: any): Promise<any[]>;
  getAulaById(id: number): Promise<any | undefined>;
  createAula(aula: any): Promise<any>;
  createMultipleAulas(aulas: any[]): Promise<any[]>;
  updateAula(id: number, aula: any): Promise<any>;
  deleteAula(id: number): Promise<boolean>;
  
  // Lead helpers
  getLeadById(id: number): Promise<Lead | undefined>;
  
  // Conflict checking
  checkSchedulingConflicts(professorId: number, studentId: number, startTime: Date, endTime: Date, excludeAulaId?: number): Promise<any>;
}

export class DatabaseStorage implements IStorage {
  sessionStore: session.Store;

  constructor() {
    this.sessionStore = new SupabaseSessionStore({
      ttl: 86400 // 24 hours
    });
  }
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(insertUser)
      .returning();
    return user;
  }

  async getAllUsers(): Promise<User[]> {
    return await db.select().from(users);
  }

  async deleteUser(id: number): Promise<boolean> {
    try {
      await db.delete(users).where(eq(users.id, id));
      return true;
    } catch (error) {
      console.error("Erro ao excluir usuário:", error);
      return false;
    }
  }

  // New professor and user helper methods
  async getUserById(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user || undefined;
  }

  async getAllProfessors(): Promise<User[]> {
    return await db.select().from(users).where(eq(users.role, 'professor'));
  }

  async createProfessor(professor: InsertUser): Promise<User> {
    const [createdProfessor] = await db
      .insert(users)
      .values({ ...professor, role: 'professor' })
      .returning();
    return createdProfessor;
  }

  async updateProfessor(id: number, professor: Partial<InsertUser>): Promise<User | undefined> {
    try {
      const [updatedProfessor] = await db
        .update(users)
        .set({ ...professor, updatedAt: new Date() })
        .where(eq(users.id, id))
        .returning();
      return updatedProfessor || undefined;
    } catch (error) {
      console.error("Erro ao atualizar professor:", error);
      return undefined;
    }
  }

  async deleteProfessor(id: number): Promise<boolean> {
    try {
      await db.delete(users).where(eq(users.id, id));
      return true;
    } catch (error) {
      console.error("Erro ao excluir professor:", error);
      return false;
    }
  }

  async hasScheduledClasses(professorId: number): Promise<boolean> {
    try {
      // Check if professor has any future classes
      const now = new Date();
      const result = await db
        .select({ count: sql<number>`count(*)` })
        .from(sessions)
        .where(
          and(
            eq(sessions.trainerId, professorId),
            sql`${sessions.startTime} > ${now}`,
            sql`${sessions.status} != 'cancelado'`
          )
        );
      
      return (result[0]?.count || 0) > 0;
    } catch (error) {
      console.error("Erro ao verificar aulas agendadas:", error);
      return false;
    }
  }

  // Lead methods
  async getLeads(): Promise<Lead[]> {
    return await db.select().from(leads);
  }

  async getLead(id: number): Promise<Lead | undefined> {
    const [lead] = await db.select().from(leads).where(eq(leads.id, id));
    return lead || undefined;
  }

  async createLead(insertLead: InsertLead): Promise<Lead> {
    try {
      console.log('Inserindo lead no banco:', {
        ...insertLead,
        notes: insertLead.notes || null,
      });

      // Ensure entryDate is a Date object
      const leadDataToInsert = {
        ...insertLead,
        notes: insertLead.notes || null,
        entryDate: insertLead.entryDate instanceof Date ? insertLead.entryDate : new Date(insertLead.entryDate || Date.now()),
      };

      const [lead] = await db
        .insert(leads)
        .values(leadDataToInsert) // Use the processed data
        .returning();

      console.log('Lead criado com sucesso:', lead);
      return lead;
    } catch (error) {
      console.error('Erro ao inserir lead no banco:', error);
      throw error;
    }
  }

  async updateLead(id: number, updates: Partial<InsertLead>): Promise<Lead | undefined> {
    // Process updates, ensuring correct types for DB
    const processedUpdates: { [key: string]: any } = { ...updates }; // Use a more flexible type initially

    if (updates.entryDate && !(updates.entryDate instanceof Date)) {
      try {
        processedUpdates.entryDate = new Date(updates.entryDate);
      } catch (e) {
        console.error("Invalid date format for entryDate during update:", updates.entryDate);
        // Decide how to handle invalid date - skip update or throw error? Here we skip.
        delete processedUpdates.entryDate;
      }
    }
    processedUpdates.updatedAt = new Date();

    // Explicitly cast to Partial<Lead> before setting, ensuring type alignment
    const [updatedLead] = await db
      .update(leads)
      .set(processedUpdates as Partial<Lead>) 
      .where(eq(leads.id, id))
      .returning();
    return updatedLead || undefined;
  }

  async deleteLead(id: number): Promise<boolean> {
    try {
      // First delete any associated WhatsApp messages
      await db
        .delete(whatsappMessages)
        .where(eq(whatsappMessages.leadId, id));

      // Then delete the lead
      await db
        .delete(leads)
        .where(eq(leads.id, id));

      return true;
    } catch (error) {
      console.error("Erro ao excluir lead:", error);
      throw error; // Re-throw to be caught by the route handler
    }
  }

  async getLeadsBySource(source: string): Promise<Lead[]> {
    return await db
      .select()
      .from(leads)
      .where(eq(leads.source, source));
  }

  async getLeadsByStatus(status: string): Promise<Lead[]> {
    return await db
      .select()
      .from(leads)
      .where(eq(leads.status, status));
  }

  async getLeadsByCampaign(campaign: string): Promise<Lead[]> {
    return await db
      .select()
      .from(leads)
      .where(eq(leads.campaign, campaign));
  }

  async getLeadsByState(state: string): Promise<Lead[]> {
    return await db
      .select()
      .from(leads)
      .where(eq(leads.state, state));
  }

  async getLeadsByPhone(phone: string): Promise<Lead[]> {
    // Remove qualquer formatação do número antes de buscar
    const cleanPhone = phone.replace(/\D/g, '');
    return await db
      .select()
      .from(leads)
      .where(
        // Verifica padrões diferentes do telefone (com e sem código do país/DDD)
        or(
          like(leads.phone, `%${cleanPhone}%`),
          // Se o número passado parece já ter código de país (mais de 10 dígitos)
          // tenta buscar versão sem código de país também
          cleanPhone.length > 10 
            ? like(leads.phone, `%${cleanPhone.substring(2)}%`) 
            : sql`false`
        )
      );
  }

  // Batch operations
  async updateLeadsInBatch(ids: number[], updates: Partial<InsertLead>): Promise<number> {
    if (ids.length === 0) return 0;

    // Process updates for batch, ensuring correct types
    const processedUpdates: { [key: string]: any } = { ...updates }; // Use flexible type

    if (updates.entryDate && !(updates.entryDate instanceof Date)) {
       try {
        processedUpdates.entryDate = new Date(updates.entryDate);
      } catch (e) {
        console.error("Invalid date format for entryDate during batch update:", updates.entryDate);
        delete processedUpdates.entryDate;
      }
    }
    processedUpdates.updatedAt = new Date();

    // Explicitly cast to Partial<Lead> before setting
    const result = await db
      .update(leads)
      .set(processedUpdates as Partial<Lead>) 
      .where(sql`${leads.id} IN (${sql.join(ids, sql`, `)})`);

    // Drizzle's update doesn't directly return affected rows count easily in all drivers
    // We return the number of IDs passed as an approximation
    return ids.length; 
  }

  async deleteLeadsInBatch(ids: number[]): Promise<number> {
    if (ids.length === 0) return 0;

    // First delete all WhatsApp messages associated with these leads
    try {
      // Delete related WhatsApp messages first
      await db
        .delete(whatsappMessages)
        .where(sql`${whatsappMessages.leadId} IN (${sql.join(ids, sql`, `)})`);

      // Then delete the leads
      await db
        .delete(leads)
        .where(sql`${leads.id} IN (${sql.join(ids, sql`, `)})`);

      return ids.length; // Return the number of deleted rows
    } catch (error) {
      console.error("Erro ao excluir leads em lote:", error);
      throw error; // Re-throw to be caught by the route handler
    }
  }

  // Trainer methods
  async getTrainers(): Promise<Trainer[]> {
    return await db.select().from(trainers).orderBy(trainers.name);
  }

  async getTrainer(id: number): Promise<Trainer | undefined> {
    const [trainer] = await db.select().from(trainers).where(eq(trainers.id, id));
    return trainer || undefined;
  }

  async createTrainer(insertTrainer: InsertTrainer): Promise<Trainer> {
    const [trainer] = await db
      .insert(trainers)
      .values({
        ...insertTrainer,
      })
      .returning();
    return trainer;
  }

  async updateTrainer(id: number, updates: Partial<InsertTrainer>): Promise<Trainer | undefined> {
    const [updatedTrainer] = await db
      .update(trainers)
      .set({
        ...updates,
        updatedAt: new Date(),
      })
      .where(eq(trainers.id, id))
      .returning();
    return updatedTrainer || undefined;
  }

  async deleteTrainer(id: number): Promise<boolean> {
    try {
      await db.delete(trainers).where(eq(trainers.id, id));
      return true;
    } catch (error) {
      console.error("Erro ao excluir professor:", error);
      return false;
    }
  }

  async getActiveTrainers(): Promise<Trainer[]> {
    return await db
      .select()
      .from(trainers)
      .where(eq(trainers.active, true))
      .orderBy(trainers.name);
  }

  async getTrainersBySpecialty(specialty: string): Promise<Trainer[]> {
    // A busca por especialidade é mais complexa porque é um array
    // Usamos SQL customizado para verificar se o array contém a especialidade
    return await db
      .select()
      .from(trainers)
      .where(sql`${specialty} = ANY(${trainers.specialties})`);
  }

  // Student methods
  async getStudents(): Promise<Student[]> {
    return await db.select().from(students).orderBy(students.id);
  }

  async getStudent(id: number): Promise<Student | undefined> {
    const [student] = await db.select().from(students).where(eq(students.id, id));
    return student || undefined;
  }

  async getStudentByLeadId(leadId: number): Promise<Student | undefined> {
    const [student] = await db.select().from(students).where(eq(students.leadId, leadId));
    return student || undefined;
  }

  async createStudent(insertStudent: InsertStudent): Promise<Student> {
    const [student] = await db
      .insert(students)
      .values({
        ...insertStudent,
      })
      .returning();
    return student;
  }

  async updateStudent(id: number, updates: Partial<InsertStudent>): Promise<Student | undefined> {
    const [updatedStudent] = await db
      .update(students)
      .set({
        ...updates,
        updatedAt: new Date(),
      })
      .where(eq(students.id, id))
      .returning();
    return updatedStudent || undefined;
  }

  async deleteStudent(id: number): Promise<boolean> {
    try {
      await db.delete(students).where(eq(students.id, id));
      return true;
    } catch (error) {
      console.error("Erro ao excluir aluno:", error);
      return false;
    }
  }

  async getActiveStudents(): Promise<Student[]> {
    return await db
      .select()
      .from(students)
      .where(eq(students.active, true))
      .orderBy(students.id);
  }

  async getStudentsBySource(source: string): Promise<Student[]> {
    return await db
      .select()
      .from(students)
      .where(eq(students.source, source));
  }

  async getStudentsWithLeadInfo(): Promise<(Student & { lead: Lead | null })[]> {
    // Explicitly select columns and structure the result
    const result = await db
      .select({
        student: students, // Select all columns from students
        lead: leads,       // Select all columns from leads
      })
      .from(students)
      .leftJoin(leads, eq(students.leadId, leads.id));

    // Map the result to the desired structure
    return result.map(row => ({
      ...row.student,
      lead: row.lead, // lead can be null due to leftJoin
    }));
  }

  // Session methods
  async getSessions(): Promise<Session[]> {
    return await db.select().from(sessions).orderBy(desc(sessions.startTime));
  }

  async getSession(id: number): Promise<Session | undefined> {
    const [session] = await db.select().from(sessions).where(eq(sessions.id, id));
    return session || undefined;
  }

  async createSession(insertSession: InsertSession): Promise<Session> {
    const [session] = await db
      .insert(sessions)
      .values({
        ...insertSession,
      })
      .returning();
    return session;
  }

  async updateSession(id: number, updates: Partial<InsertSession>): Promise<Session | undefined> {
    const [updatedSession] = await db
      .update(sessions)
      .set({
        ...updates,
        updatedAt: new Date(),
      })
      .where(eq(sessions.id, id))
      .returning();
    return updatedSession || undefined;
  }

  async deleteSession(id: number): Promise<boolean> {
    try {
      await db.delete(sessions).where(eq(sessions.id, id));
      return true;
    } catch (error) {
      console.error("Erro ao excluir sessão:", error);
      return false;
    }
  }

  async getSessionsByStudentId(studentId: number): Promise<Session[]> {
    return await db
      .select()
      .from(sessions)
      .where(eq(sessions.studentId, studentId))
      .orderBy(desc(sessions.startTime));
  }

  async getSessionsByTrainerId(trainerId: number): Promise<Session[]> {
    return await db
      .select()
      .from(sessions)
      .where(eq(sessions.trainerId, trainerId))
      .orderBy(desc(sessions.startTime));
  }

  async getSessionsByDateRange(startDate: Date, endDate: Date): Promise<Session[]> {
    return await db
      .select()
      .from(sessions)
      .where(and(
        between(sessions.startTime, startDate, endDate),
      ))
      .orderBy(asc(sessions.startTime));
  }

  async getSessionsByStatus(status: string): Promise<Session[]> {
    return await db
      .select()
      .from(sessions)
      .where(eq(sessions.status, status))
      .orderBy(desc(sessions.startTime));
  }

  async getSessionsBySource(source: string): Promise<Session[]> {
    return await db
      .select()
      .from(sessions)
      .where(eq(sessions.source, source))
      .orderBy(desc(sessions.startTime));
  }

  async getSessionsWithDetails(): Promise<any[]> {
    // Alias para evitar colisões de nome
    const s = alias(students, 'student');
    const t = alias(trainers, 'trainer');
    const l = alias(leads, 'lead');

    return await db
      .select({
        id: sessions.id,
        startTime: sessions.startTime,
        endTime: sessions.endTime,
        location: sessions.location,
        notes: sessions.notes,
        status: sessions.status,
        source: sessions.source,
        googleEventId: sessions.googleEventId,
        createdAt: sessions.createdAt,
        updatedAt: sessions.updatedAt,
        student: {
          id: s.id,
          name: l.name,
          email: l.email,
          phone: l.phone,
          source: s.source,
          address: s.address,
        },
        trainer: {
          id: t.id,
          name: t.name,
          email: t.email,
          phone: t.phone,
          specialties: t.specialties,
        }
      })
      .from(sessions)
      .leftJoin(s, eq(sessions.studentId, s.id))
      .leftJoin(t, eq(sessions.trainerId, t.id))
      .leftJoin(l, eq(s.leadId, l.id))
      .orderBy(desc(sessions.startTime));
  }

  async getCompletedSessionsByStudent(
    studentId: number, 
    startDate?: Date, 
    endDate?: Date
  ): Promise<Session[]> {
    // Define base conditions as an array, explicitly typing elements as SQL
    const conditions: SQL[] = [
      eq(sessions.studentId, studentId) as SQL,
      eq(sessions.status, 'concluido') as SQL // Ensure this matches your actual status value
    ];

    // Conditionally add the date range filter to the conditions array
    if (startDate && endDate) {
      conditions.push(between(sessions.startTime, startDate, endDate) as SQL);
    }

    // Build and execute the query using the conditions array
    return await db
      .select()
      .from(sessions)
      .where(and(...conditions)) // Apply all conditions using and()
      .orderBy(asc(sessions.startTime));
  }

  // Session history methods
  async createSessionHistory(history: InsertSessionHistory): Promise<SessionHistory> {
    // Use the imported table schema object (aliased as sessionHistoryTable)
    const [newSessionHistory] = await db
      .insert(sessionHistoryTable) // Use the correct table schema object
      .values(history)
      .returning();
    return newSessionHistory; // Return the newly created history entry
  }

  async getSessionHistoryBySessionId(sessionId: number): Promise<SessionHistory[]> {
    return await db
      .select()
      .from(sessionHistoryTable) // Use the correct table schema object
      .where(eq(sessionHistoryTable.sessionId, sessionId))
      .orderBy(desc(sessionHistoryTable.changedAt));
  }

  // Task methods
  async getTasks(): Promise<Task[]> {
    return await db.select().from(tasks).orderBy(desc(tasks.createdAt));
  }

  async getTask(id: number): Promise<Task | undefined> {
    const [task] = await db.select().from(tasks).where(eq(tasks.id, id));
    return task || undefined;
  }

  async createTask(insertTask: InsertTask): Promise<Task> {
    // Log the incoming task data
    console.log('Creating task with data:', JSON.stringify(insertTask, null, 2));

    // Create a new object with processed data
    const processedTask = {
      ...insertTask,
    };

    // Ensure dueDate is a proper Date object if it exists
    if (processedTask.dueDate !== undefined && processedTask.dueDate !== null) {
      // If it's already a Date object, keep it; otherwise, try to create a new Date
      if (!(processedTask.dueDate instanceof Date)) {
        console.log('Converting dueDate to Date object:', processedTask.dueDate);
        try {
          processedTask.dueDate = new Date(processedTask.dueDate);
          console.log('Converted dueDate:', processedTask.dueDate);
        } catch (error) {
          console.error('Failed to convert dueDate to Date object:', error);
          // If conversion fails, set to null to avoid database errors
          processedTask.dueDate = null;
        }
      }
    }

    // Log the processed task data
    console.log('Processed task data:', JSON.stringify(processedTask, null, 2));

    const [task] = await db
      .insert(tasks)
      .values(processedTask)
      .returning();
    return task;
  }

  async updateTask(id: number, updates: Partial<InsertTask>): Promise<Task | undefined> {
    // Log the incoming update data
    console.log('Updating task', id, 'with data:', JSON.stringify(updates, null, 2));

    // Create a new object with processed data
    const processedUpdates = {
      ...updates,
      updatedAt: new Date()
    };

    // Ensure dueDate is a proper Date object if it exists
    if (processedUpdates.dueDate !== undefined && processedUpdates.dueDate !== null) {
      // If it's already a Date object, keep it; otherwise, try to create a new Date
      if (!(processedUpdates.dueDate instanceof Date)) {
        console.log('Converting dueDate to Date object:', processedUpdates.dueDate);
        try {
          processedUpdates.dueDate = new Date(processedUpdates.dueDate);
          console.log('Converted dueDate:', processedUpdates.dueDate);
        } catch (error) {
          console.error('Failed to convert dueDate to Date object:', error);
          // If conversion fails, set to null to avoid database errors
          processedUpdates.dueDate = null;
        }
      }
    }

    // Log the processed update data
    console.log('Processed update data:', JSON.stringify(processedUpdates, null, 2));

    const [updatedTask] = await db
      .update(tasks)
      .set(processedUpdates)
      .where(eq(tasks.id, id))
      .returning();
    return updatedTask || undefined;
  }

  async deleteTask(id: number): Promise<boolean> {
    try {
      // Primeiro excluir comentários associados
      await db.delete(taskComments).where(eq(taskComments.taskId, id));

      // Depois excluir a tarefa
      await db.delete(tasks).where(eq(tasks.id, id));
      return true;
    } catch (error) {
      console.error("Erro ao excluir tarefa:", error);
      return false;
    }
  }

  async getTasksByAssignedToId(userId: number): Promise<Task[]> {
    return await db
      .select()
      .from(tasks)
      .where(eq(tasks.assignedToId, userId))
      .orderBy(desc(tasks.createdAt));
  }

  async getTasksByAssignedById(userId: number): Promise<Task[]> {
    return await db
      .select()
      .from(tasks)
      .where(eq(tasks.assignedById, userId))
      .orderBy(desc(tasks.createdAt));
  }

  async getTasksByStatus(status: string): Promise<Task[]> {
    return await db
      .select()
      .from(tasks)
      .where(eq(tasks.status, status))
      .orderBy(desc(tasks.createdAt));
  }

  async getTasksByRelatedLeadId(leadId: number): Promise<Task[]> {
    return await db
      .select()
      .from(tasks)
      .where(eq(tasks.relatedLeadId, leadId))
      .orderBy(desc(tasks.createdAt));
  }

  // Task comments methods
  async getTaskCommentsByTaskId(taskId: number): Promise<TaskComment[]> {
    return await db
      .select()
      .from(taskComments)
      .where(eq(taskComments.taskId, taskId))
      .orderBy(asc(taskComments.createdAt));
  }

  async createTaskComment(insertComment: InsertTaskComment): Promise<TaskComment> {
    const [comment] = await db
      .insert(taskComments)
      .values({
        ...insertComment,
      })
      .returning();
    return comment;
  }

  async deleteTaskComment(id: number): Promise<boolean> {
    try {
      await db.delete(taskComments).where(eq(taskComments.id, id));
      return true;
    } catch (error) {
      console.error("Erro ao excluir comentário:", error);
      return false;
    }
  }

  // WhatsApp methods
  async getWhatsappMessages(leadId: number): Promise<WhatsappMessage[]> {
    return await db
      .select()
      .from(whatsappMessages)
      .where(eq(whatsappMessages.leadId, leadId))
      .orderBy(asc(whatsappMessages.timestamp));
  }

  async getWhatsappMessageById(id: number): Promise<WhatsappMessage | undefined> {
    const messages = await db
      .select()
      .from(whatsappMessages)
      .where(eq(whatsappMessages.id, id))
      .limit(1);

    return messages[0];
  }

  async getWhatsappMessageByApiId(messageId: string): Promise<WhatsappMessage | undefined> {
    const messages = await db
      .select()
      .from(whatsappMessages)
      .where(eq(whatsappMessages.messageId, messageId))
      .limit(1);

    return messages[0];
  }

  async createWhatsappMessage(message: InsertWhatsappMessage): Promise<WhatsappMessage> {
    const [newMessage] = await db
      .insert(whatsappMessages)
      .values(message)
      .returning();
    return newMessage;
  }

  async updateWhatsappMessageStatus(id: number, status: string): Promise<WhatsappMessage | undefined> {
    const [updatedMessage] = await db
      .update(whatsappMessages)
      .set({ status })
      .where(eq(whatsappMessages.id, id))
      .returning();
    return updatedMessage || undefined;
  }

  async updateWhatsappMessageId(id: number, messageId: string): Promise<WhatsappMessage | undefined> {
    const [updatedMessage] = await db
      .update(whatsappMessages)
      .set({ messageId })
      .where(eq(whatsappMessages.id, id))
      .returning();
    return updatedMessage || undefined;
  }

  async deleteWhatsappMessage(id: number): Promise<boolean> {
    try {
      await db.delete(whatsappMessages).where(eq(whatsappMessages.id, id));
      return true;
    } catch (error) {
      console.error("Erro ao excluir mensagem:", error);
      return false;
    }
  }

  // WhatsApp Settings methods
  async getWhatsappSettings(): Promise<WhatsappSettings | undefined> {
    const [settings] = await db.select().from(whatsappSettings).orderBy(desc(whatsappSettings.updatedAt)).limit(1);
    return settings || undefined;
  }

  async saveWhatsappSettings(settings: InsertWhatsappSettings): Promise<WhatsappSettings> {
    // Sempre insere um novo registro (pode ser ajustado para update se preferir)
    const [saved] = await db.insert(whatsappSettings).values(settings).returning();
    return saved;
  }

  // Google OAuth2 token management
  async saveGoogleTokens(userId: number, tokens: {
    access_token: string;
    refresh_token?: string;
    expiry_date: number;
  }): Promise<void> {
    try {
      // Usar SQL direto para gerenciar tokens do Google
      await db.execute(sql`
        INSERT INTO google_tokens (userId, accessToken, refreshToken, expiryDate, updatedAt)
        VALUES (${userId}, ${tokens.access_token}, ${tokens.refresh_token || null}, ${tokens.expiry_date}, ${new Date().toISOString()})
        ON CONFLICT (userId) 
        DO UPDATE SET 
          accessToken = ${tokens.access_token},
          refreshToken = ${tokens.refresh_token || null},
          expiryDate = ${tokens.expiry_date},
          updatedAt = ${new Date().toISOString()}
      `);
      
      console.log("Google tokens salvos com sucesso para usuário:", userId);
    } catch (error) {
      console.error("Erro ao salvar tokens do Google:", error);
      throw error;
    }
  }

  async getGoogleTokens(userId: number): Promise<{
    access_token: string;
    refresh_token?: string;
    expiry_date: number;
  } | null> {
    try {
      const result = await db.execute(sql`
        SELECT accessToken, refreshToken, expiryDate 
        FROM google_tokens 
        WHERE userId = ${userId}
      `);
      
      if (!result.rows || result.rows.length === 0) {
        console.log("Nenhum token encontrado para usuário:", userId);
        return null;
      }
      
      const token = result.rows[0] as any;
      
      return {
        access_token: token.accesstoken,
        refresh_token: token.refreshtoken,
        expiry_date: parseInt(token.expirydate),
      };
    } catch (error) {
      console.error("Erro ao buscar tokens do Google:", error);
      throw error;
    }
  }

  async deleteGoogleTokens(userId: number): Promise<void> {
    try {
      await db.execute(sql`
        DELETE FROM google_tokens 
        WHERE userId = ${userId}
      `);
      
      console.log("Tokens do Google removidos para usuário:", userId);
    } catch (error) {
      console.error("Erro ao remover tokens do Google:", error);
      throw error;
    }
  }

  // NEW SCHEDULING SYSTEM METHODS

  // Lead helper method
  async getLeadById(id: number): Promise<Lead | undefined> {
    const [lead] = await db.select().from(leads).where(eq(leads.id, id));
    return lead || undefined;
  }

  // Agendamentos Recorrentes methods
  async createAgendamentoRecorrente(agendamento: InsertAgendamentoRecorrente): Promise<AgendamentoRecorrente> {
    const [created] = await db
      .insert(agendamentosRecorrentes)
      .values(agendamento)
      .returning();
    return created;
  }

  async getAgendamentosRecorrentes(): Promise<AgendamentoRecorrente[]> {
    return await db.select().from(agendamentosRecorrentes);
  }

  async updateAgendamentoRecorrente(id: number, agendamento: Partial<InsertAgendamentoRecorrente>): Promise<AgendamentoRecorrente | undefined> {
    try {
      const [updated] = await db
        .update(agendamentosRecorrentes)
        .set({ ...agendamento, updatedAt: new Date() })
        .where(eq(agendamentosRecorrentes.id, id))
        .returning();
      return updated || undefined;
    } catch (error) {
      console.error("Erro ao atualizar agendamento recorrente:", error);
      return undefined;
    }
  }

  async deleteAgendamentoRecorrente(id: number): Promise<boolean> {
    try {
      await db.delete(agendamentosRecorrentes).where(eq(agendamentosRecorrentes.id, id));
      return true;
    } catch (error) {
      console.error("Erro ao excluir agendamento recorrente:", error);
      return false;
    }
  }

  // Aulas methods
  async getAulas(filters?: any): Promise<Aula[]> {
    let query = db.select().from(aulas);
    
    if (filters) {
      const conditions = [];
      
      if (filters.startDate && filters.endDate) {
        conditions.push(
          and(
            sql`${aulas.startTime} >= ${filters.startDate}`,
            sql`${aulas.startTime} <= ${filters.endDate}`
          )
        );
      }
      
      if (filters.professorId) {
        conditions.push(eq(aulas.professorId, filters.professorId));
      }
      
      if (filters.studentId) {
        conditions.push(eq(aulas.studentId, filters.studentId));
      }
      
      if (filters.status) {
        conditions.push(eq(aulas.status, filters.status));
      }
      
      if (conditions.length > 0) {
        query = query.where(and(...conditions));
      }
    }
    
    return await query.orderBy(asc(aulas.startTime));
  }

  async getAulaById(id: number): Promise<Aula | undefined> {
    const [aula] = await db.select().from(aulas).where(eq(aulas.id, id));
    return aula || undefined;
  }

  async createAula(aula: InsertAula): Promise<Aula> {
    const [created] = await db
      .insert(aulas)
      .values(aula)
      .returning();
    return created;
  }

  async createMultipleAulas(aulasList: InsertAula[]): Promise<Aula[]> {
    const created = await db
      .insert(aulas)
      .values(aulasList)
      .returning();
    return created;
  }

  async updateAula(id: number, aula: Partial<InsertAula>): Promise<Aula | undefined> {
    try {
      const [updated] = await db
        .update(aulas)
        .set({ ...aula, updatedAt: new Date() })
        .where(eq(aulas.id, id))
        .returning();
      return updated || undefined;
    } catch (error) {
      console.error("Erro ao atualizar aula:", error);
      return undefined;
    }
  }

  async deleteAula(id: number): Promise<boolean> {
    try {
      await db.delete(aulas).where(eq(aulas.id, id));
      return true;
    } catch (error) {
      console.error("Erro ao excluir aula:", error);
      return false;
    }
  }

  // Conflict checking
  async checkSchedulingConflicts(
    professorId: number, 
    studentId: number, 
    startTime: Date, 
    endTime: Date, 
    excludeAulaId?: number
  ): Promise<any> {
    try {
      const conditions = [
        and(
          // Check for overlapping times
          or(
            and(
              sql`${aulas.startTime} < ${endTime}`,
              sql`${aulas.endTime} > ${startTime}`
            )
          ),
          // Check for same professor OR same student
          or(
            eq(aulas.professorId, professorId),
            eq(aulas.studentId, studentId)
          ),
          // Exclude cancelled classes
          sql`${aulas.status} != 'cancelado'`
        )
      ];

      // Exclude specific aula if provided (for updates)
      if (excludeAulaId) {
        conditions.push(sql`${aulas.id} != ${excludeAulaId}`);
      }

      const conflicts = await db
        .select()
        .from(aulas)
        .where(and(...conditions))
        .limit(1);

      return conflicts.length > 0 ? conflicts[0] : null;
    } catch (error) {
      console.error("Erro ao verificar conflitos:", error);
      return null;
    }
  }
}

// Inicializa o armazenamento usando o banco de dados PostgreSQL
export const storage = new DatabaseStorage();