import { calendar as googleCalendar, auth as googleAuth } from '@googleapis/calendar';
import { storage } from './storage';
import { Trainer, Session } from '@shared/schema';
import { formatInTimeZone } from 'date-fns-tz';

// Configuração do OAuth2
const oauth2Client = new googleAuth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI || `${process.env.REPL_URL || 'http://localhost:5000'}/api/oauth/google/callback`
);

// Criar uma instância da API do Calendar
const calendar = googleCalendar({ version: 'v3', auth: oauth2Client });

// TODO: Implementar modo de teste para desenvolvimento sem API keys
const isTestMode = !process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET;

// Função para simular requisições do calendar em modo de teste
function simulateCalendarOperation(operation: string, data: any = {}): any {
  console.log(`[SIMULAÇÃO GOOGLE CALENDAR] ${operation}`, data);
  
  // Simular dados de resposta com base na operação
  if (operation === 'insert') {
    return { data: { id: `fake-event-${Date.now()}` } };
  } else if (operation === 'update' || operation === 'delete') {
    return { data: { updated: true } };
  } else if (operation === 'list') {
    return { data: { items: [] } };
  }
  
  return { data: {} };
}

// Escopos necessários para acessar o calendar
const SCOPES = [
  'https://www.googleapis.com/auth/calendar',
  'https://www.googleapis.com/auth/calendar.events'
];

/**
 * Gera a URL de autorização para o Google
 */
export function getAuthUrl(): string {
  if (isTestMode) {
    console.log(`[SIMULAÇÃO GOOGLE CALENDAR] getAuthUrl`);
    return 'https://teste-oauth-url.example.com/authorize';
  }
  
  return oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES,
    prompt: 'consent'
  });
}

/**
 * Troca o código de autorização por tokens de acesso e atualização
 */
export async function getTokensFromCode(code: string): Promise<{
  access_token: string;
  refresh_token?: string;
  expiry_date: number;
}> {
  if (isTestMode) {
    console.log(`[SIMULAÇÃO GOOGLE CALENDAR] getTokensFromCode ${code}`);
    return {
      access_token: 'fake-access-token',
      refresh_token: 'fake-refresh-token',
      expiry_date: Date.now() + 3600000, // 1 hora a partir de agora
    };
  }
  
  const { tokens } = await oauth2Client.getToken(code);
  return {
    access_token: tokens.access_token!,
    refresh_token: tokens.refresh_token,
    expiry_date: tokens.expiry_date!,
  };
}

/**
 * Define as credenciais para o cliente OAuth2
 */
export function setCredentials(tokens: {
  access_token: string;
  refresh_token?: string;
  expiry_date: number;
}): void {
  if (isTestMode) {
    console.log(`[SIMULAÇÃO GOOGLE CALENDAR] setCredentials`, tokens);
    return;
  }
  
  oauth2Client.setCredentials({
    access_token: tokens.access_token,
    refresh_token: tokens.refresh_token,
    expiry_date: tokens.expiry_date
  });
}

/**
 * Carrega tokens de um usuário e configura as credenciais
 */
export async function loadUserCredentials(userId: number): Promise<boolean> {
  if (isTestMode) {
    console.log(`[SIMULAÇÃO GOOGLE CALENDAR] loadUserCredentials for user ${userId}`);
    return true;
  }
  
  try {
    const tokens = await storage.getGoogleTokens(userId);
    if (!tokens) {
      return false;
    }
    
    setCredentials(tokens);
    
    // Verificar se o token precisa ser renovado
    const now = Date.now();
    if (tokens.expiry_date <= now + 300000) { // Renovar se expira em 5 minutos
      await refreshTokenIfNeeded(userId);
    }
    
    return true;
  } catch (error) {
    console.error('Erro ao carregar credenciais do usuário:', error);
    return false;
  }
}

/**
 * Renova o token de acesso se necessário
 */
async function refreshTokenIfNeeded(userId: number): Promise<void> {
  try {
    const tokens = await storage.getGoogleTokens(userId);
    if (!tokens?.refresh_token) {
      throw new Error('Refresh token não disponível');
    }
    
    oauth2Client.setCredentials({
      refresh_token: tokens.refresh_token
    });
    
    const { credentials } = await oauth2Client.refreshAccessToken();
    
    if (credentials.access_token && credentials.expiry_date) {
      const newTokens = {
        access_token: credentials.access_token,
        refresh_token: credentials.refresh_token || tokens.refresh_token,
        expiry_date: credentials.expiry_date
      };
      
      await storage.saveGoogleTokens(userId, newTokens);
      setCredentials(newTokens);
    }
  } catch (error) {
    console.error('Erro ao renovar token:', error);
    throw error;
  }
}

/**
 * Cria um evento no Google Calendar
 */
export async function createCalendarEvent(session: Session, trainer: Trainer, studentName: string): Promise<string | null> {
  try {
    // Formatar as datas para ISO
    const startTimeISO = session.startTime instanceof Date ? 
      formatInTimeZone(session.startTime, 'America/Sao_Paulo', "yyyy-MM-dd'T'HH:mm:ss.SSSxxx") : 
      formatInTimeZone(new Date(session.startTime), 'America/Sao_Paulo', "yyyy-MM-dd'T'HH:mm:ss.SSSxxx");
    
    const endTimeISO = session.endTime instanceof Date ? 
      formatInTimeZone(session.endTime, 'America/Sao_Paulo', "yyyy-MM-dd'T'HH:mm:ss.SSSxxx") : 
      formatInTimeZone(new Date(session.endTime), 'America/Sao_Paulo', "yyyy-MM-dd'T'HH:mm:ss.SSSxxx");

    // Cor do evento baseada na fonte (Favale = azul, Pink = rosa)
    const colorId = session.source === 'Favale' ? '1' : '3'; // 1=azul, 3=roxo/rosa
    
    // Criar o evento
    const event = {
      summary: `Treino ${session.source}: ${studentName}`,
      location: session.location,
      description: session.notes || `Sessão de treinamento para ${studentName}`,
      start: {
        dateTime: startTimeISO,
        timeZone: 'America/Sao_Paulo',
      },
      end: {
        dateTime: endTimeISO,
        timeZone: 'America/Sao_Paulo',
      },
      colorId: colorId,
      attendees: [
        { email: trainer.email, responseStatus: 'accepted' },
      ],
      reminders: {
        useDefault: false,
        overrides: [
          { method: 'email', minutes: 24 * 60 }, // 1 dia antes
          { method: 'popup', minutes: 60 } // 1 hora antes
        ],
      },
    };

    // ID do calendário do professor ou o calendário primário se não especificado
    const calendarId = trainer.calendarId || 'primary';

    // Modo de teste ou produção
    let response;
    if (isTestMode) {
      // Simular operação do Google Calendar em modo de teste
      response = simulateCalendarOperation('insert', {
        calendarId,
        event,
        studentName,
        trainerEmail: trainer.email
      });
    } else {
      // Fazer requisição real ao Google Calendar
      response = await calendar.events.insert({
        calendarId: calendarId,
        requestBody: event,
        sendNotifications: true,
      });
    }

    return response.data.id || null;
  } catch (error) {
    console.error('Erro ao criar evento no Google Calendar:', error);
    return null;
  }
}

/**
 * Atualiza um evento no Google Calendar
 */
export async function updateCalendarEvent(
  session: Session, 
  trainer: Trainer, 
  studentName: string, 
  eventId: string
): Promise<boolean> {
  try {
    // Formatar as datas para ISO
    const startTimeISO = session.startTime instanceof Date ? 
      formatInTimeZone(session.startTime, 'America/Sao_Paulo', "yyyy-MM-dd'T'HH:mm:ss.SSSxxx") : 
      formatInTimeZone(new Date(session.startTime), 'America/Sao_Paulo', "yyyy-MM-dd'T'HH:mm:ss.SSSxxx");
    
    const endTimeISO = session.endTime instanceof Date ? 
      formatInTimeZone(session.endTime, 'America/Sao_Paulo', "yyyy-MM-dd'T'HH:mm:ss.SSSxxx") : 
      formatInTimeZone(new Date(session.endTime), 'America/Sao_Paulo', "yyyy-MM-dd'T'HH:mm:ss.SSSxxx");

    // Cor do evento baseada na fonte (Favale = azul, Pink = rosa)
    const colorId = session.source === 'Favale' ? '1' : '3'; // 1=azul, 3=roxo/rosa

    // Dados atualizados do evento
    const event = {
      summary: `Treino ${session.source}: ${studentName}`,
      location: session.location,
      description: session.notes || `Sessão de treinamento para ${studentName}`,
      start: {
        dateTime: startTimeISO,
        timeZone: 'America/Sao_Paulo',
      },
      end: {
        dateTime: endTimeISO,
        timeZone: 'America/Sao_Paulo',
      },
      colorId: colorId,
      attendees: [
        { email: trainer.email, responseStatus: 'accepted' },
      ],
      reminders: {
        useDefault: false,
        overrides: [
          { method: 'email', minutes: 24 * 60 }, // 1 dia antes
          { method: 'popup', minutes: 60 } // 1 hora antes
        ],
      },
    };
    
    // ID do calendário do professor ou o calendário primário se não especificado
    const calendarId = trainer.calendarId || 'primary';
    
    // Modo de teste ou produção
    if (isTestMode) {
      // Simular operação do Google Calendar em modo de teste
      simulateCalendarOperation('update', {
        calendarId,
        eventId,
        event,
        studentName,
        trainerEmail: trainer.email
      });
    } else {
      // Fazer requisição real ao Google Calendar
      await calendar.events.update({
        calendarId: calendarId,
        eventId: eventId,
        requestBody: event,
        sendNotifications: true,
      });
    }
    
    return true;
  } catch (error) {
    console.error('Erro ao atualizar evento no Google Calendar:', error);
    return false;
  }
}

/**
 * Cancela (exclui) um evento no Google Calendar
 */
export async function deleteCalendarEvent(trainer: Trainer, eventId: string): Promise<boolean> {
  try {
    // ID do calendário do professor ou o calendário primário se não especificado
    const calendarId = trainer.calendarId || 'primary';
    
    // Modo de teste ou produção
    if (isTestMode) {
      // Simular operação do Google Calendar em modo de teste
      simulateCalendarOperation('delete', {
        calendarId,
        eventId,
        trainerEmail: trainer.email
      });
    } else {
      // Fazer requisição real ao Google Calendar
      await calendar.events.delete({
        calendarId: calendarId,
        eventId: eventId,
        sendNotifications: true,
      });
    }
    
    return true;
  } catch (error) {
    console.error('Erro ao excluir evento no Google Calendar:', error);
    return false;
  }
}

/**
 * Verifica disponibilidade do professor em um período específico
 */
export async function checkTrainerAvailability(
  trainer: Trainer, 
  startTime: Date, 
  endTime: Date
): Promise<boolean> {
  try {
    // ID do calendário do professor ou o calendário primário se não especificado
    const calendarId = trainer.calendarId || 'primary';
    
    // Formatar as datas para ISO
    const startTimeISO = formatInTimeZone(startTime, 'America/Sao_Paulo', "yyyy-MM-dd'T'HH:mm:ss.SSSxxx");
    const endTimeISO = formatInTimeZone(endTime, 'America/Sao_Paulo', "yyyy-MM-dd'T'HH:mm:ss.SSSxxx");
    
    // Modo de teste ou produção
    let response;
    if (isTestMode) {
      // Simular operação do Google Calendar em modo de teste
      response = simulateCalendarOperation('list', {
        calendarId,
        timeMin: startTimeISO,
        timeMax: endTimeISO,
        trainerEmail: trainer.email
      });
      // Em modo de teste, sempre retornar disponível
      return true;
    } else {
      // Fazer requisição real ao Google Calendar
      response = await calendar.events.list({
        calendarId: calendarId,
        timeMin: startTimeISO,
        timeMax: endTimeISO,
        singleEvents: true,
        orderBy: 'startTime',
      });
      
      // Se não há eventos no período, o professor está disponível
      return response.data.items && response.data.items.length === 0;
    }
  } catch (error) {
    console.error('Erro ao verificar disponibilidade do professor:', error);
    return false;
  }
}

/**
 * Obtém todos os eventos do calendário de um professor em um período
 */
export async function getTrainerEvents(
  trainer: Trainer, 
  startDate: Date, 
  endDate: Date
): Promise<any[]> {
  try {
    // ID do calendário do professor ou o calendário primário se não especificado
    const calendarId = trainer.calendarId || 'primary';
    
    // Formatar as datas para ISO
    const startTimeISO = formatInTimeZone(startDate, 'America/Sao_Paulo', "yyyy-MM-dd'T'HH:mm:ss.SSSxxx");
    const endTimeISO = formatInTimeZone(endDate, 'America/Sao_Paulo', "yyyy-MM-dd'T'HH:mm:ss.SSSxxx");
    
    // Modo de teste ou produção
    let response;
    if (isTestMode) {
      // Simular operação do Google Calendar em modo de teste
      response = simulateCalendarOperation('list', {
        calendarId,
        timeMin: startTimeISO,
        timeMax: endTimeISO,
        trainerEmail: trainer.email
      });
      // Em modo de teste, retornar um array vazio
      return [];
    } else {
      // Fazer requisição real ao Google Calendar
      response = await calendar.events.list({
        calendarId: calendarId,
        timeMin: startTimeISO,
        timeMax: endTimeISO,
        singleEvents: true,
        orderBy: 'startTime',
      });
      
      return response.data.items || [];
    }
  } catch (error) {
    console.error('Erro ao obter eventos do professor:', error);
    return [];
  }
}
