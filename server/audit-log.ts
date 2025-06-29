/**
 * Módulo de registro de auditoria para ações sensíveis
 * 
 * Este módulo fornece funções para registrar ações importantes do usuário
 * para fins de auditoria e segurança.
 */

import fs from 'fs';
import path from 'path';
import { Request } from 'express';

// Diretório para os logs
const LOG_DIR = path.join(process.cwd(), 'logs');
const AUDIT_LOG = path.join(LOG_DIR, 'audit.log');

// Certifique-se de que o diretório de logs existe
try {
  if (!fs.existsSync(LOG_DIR)) {
    fs.mkdirSync(LOG_DIR, { recursive: true });
  }
} catch (error) {
  console.error('Erro ao criar diretório de logs:', error);
}

/**
 * Tipos de eventos de auditoria
 */
export enum AuditEventType {
  LOGIN_SUCCESS = 'login_success',
  LOGIN_FAILURE = 'login_failure',
  LOGOUT = 'logout',
  USER_CREATED = 'user_created',
  USER_DELETED = 'user_deleted',
  PASSWORD_CHANGED = 'password_changed',
  LEAD_CREATED = 'lead_created',
  LEAD_UPDATED = 'lead_updated',
  LEAD_DELETED = 'lead_deleted',
  TASK_CREATED = 'task_created',
  TASK_UPDATED = 'task_updated',
  TASK_DELETED = 'task_deleted',
  SESSION_CREATED = 'session_created',
  SESSION_UPDATED = 'session_updated',
  SESSION_DELETED = 'session_deleted',
  DATA_EXPORT = 'data_export',
  SETTINGS_CHANGED = 'settings_changed',
  WHATSAPP_CONFIG_CHANGED = 'whatsapp_config_changed',
  WHATSAPP_MESSAGE_SENT = 'whatsapp_message_sent',
  OAUTH_INIT = 'oauth_init',
  OAUTH_SUCCESS = 'oauth_success',
  OAUTH_ERROR = 'oauth_error',
  OAUTH_REVOKE = 'oauth_revoke'
}

/**
 * Registra um evento de auditoria
 */
export function logAuditEvent(type: AuditEventType, req: Request, details: any = {}) {
  const timestamp = new Date().toISOString();
  const userId = req.user?.id || 'anonymous';
  const username = req.user?.username || 'anonymous';
  const ip = req.ip || req.socket.remoteAddress || 'unknown';

  // Remover informações sensíveis dos detalhes
  const sanitizedDetails = { ...details };
  if (sanitizedDetails.password) {
    sanitizedDetails.password = '[REDACTED]';
  }

  const logEntry = {
    timestamp,
    type,
    userId,
    username,
    ip,
    details: sanitizedDetails,
  };

  // Escrever no arquivo de log
  try {
    fs.appendFileSync(AUDIT_LOG, JSON.stringify(logEntry) + '\n');
  } catch (error) {
    console.error('Erro ao escrever log de auditoria:', error);
  }

  // Também registrar no console para desenvolvimento
  if (process.env.NODE_ENV !== 'production') {
    console.log(`[AUDIT] ${type} - Usuário: ${username} (${userId}) - IP: ${ip}`);
  }
}

/**
 * Obtém os logs de auditoria mais recentes
 */
export function getRecentAuditLogs(count: number = 100) {
  try {
    if (!fs.existsSync(AUDIT_LOG)) {
      return [];
    }

    const logs = fs.readFileSync(AUDIT_LOG, 'utf8')
      .split('\n')
      .filter(line => line.trim() !== '')
      .map(line => JSON.parse(line))
      .slice(-count); // Pegar apenas os últimos 'count' logs

    return logs;
  } catch (error) {
    console.error('Erro ao ler logs de auditoria:', error);
    return [];
  }
}