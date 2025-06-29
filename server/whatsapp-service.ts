/**
 * Serviço WhatsApp API
 * Integra com a API oficial do WhatsApp e Evolution API para envio e recebimento de mensagens
 */

import axios from 'axios';
import { log } from './vite';
import { Lead } from '@shared/schema';
import { storage } from './storage';

// Configurações da API do WhatsApp
const WHATSAPP_API_TOKEN = process.env.WHATSAPP_API_TOKEN;
const WHATSAPP_PHONE_ID = process.env.WHATSAPP_PHONE_ID || '6536281892435135';
const WHATSAPP_API_URL = 'https://graph.facebook.com/v18.0';

// Evolution API configs
const EVOLUTION_API_URL = process.env.EVOLUTION_API_URL || 'https://evolution-api.example.com/api/v1';
const EVOLUTION_API_TOKEN = process.env.EVOLUTION_API_TOKEN || '7f3b2c4d1e6a8f0b9d3c5e7a2f4b6d8c';
const EVOLUTION_API_INSTANCE = process.env.EVOLUTION_API_INSTANCE || 'default';
const WHATSAPP_TEST_MODE = process.env.WHATSAPP_TEST_MODE === 'true';

// Logs para facilitar depuração
log(`Usando EVOLUTION_API_URL: ${EVOLUTION_API_URL}`, 'info');
log(`Modo de teste WhatsApp: ${WHATSAPP_TEST_MODE ? 'Ativado' : 'Desativado'}`, 'info');

// Interface para resposta da API WhatsApp Oficial
interface WhatsAppAPIResponse {
  messaging_product: string;
  contacts?: {
    input: string;
    wa_id: string;
  }[];
  messages?: {
    id: string;
  }[];
  error?: {
    message: string;
    type: string;
    code: number;
    error_subcode?: number;
    fbtrace_id: string;
  };
}

// Interface para resposta da Evolution API
interface EvolutionAPIResponse {
  key?: {
    fromMe: boolean;
    remoteJid: string;
    id: string;
  };
  status?: string;
  message?: string;
  error?: string;
  info?: any;
}

// Interface compartilhada para retorno das funções de WhatsApp
interface WhatsAppResult {
  success: boolean;
  messageId?: string;
  error?: string;
  details?: any;
}

/**
 * Função auxiliar para fazer requisições para a Evolution API
 */
async function makeEvolutionRequest(endpoint: string, method = 'GET', data: any = null): Promise<WhatsAppResult> {
  try {
    const settings = await getConfigSettings();
    const { apiUrl, apiToken, apiInstance } = settings;

    if (!apiUrl || !apiToken) {
      return { success: false, error: 'Configuração da Evolution API (URL ou Token) não encontrada.' };
    }

    // Substitua {instance} no endpoint se necessário
    const finalEndpoint = endpoint.replace('{instance}', apiInstance);
    const fullUrl = `${apiUrl}${finalEndpoint}`;
    
    log(`Fazendo requisição ${method} para ${fullUrl}`, 'info');

    const response = await axios({
      method,
      url: fullUrl,
      data,
      headers: {
        'Content-Type': 'application/json',
        'apikey': apiToken
      },
      timeout: 20000 // 20 segundos
    });

    return { success: true, details: response.data };
  } catch (error) {
    let errorMessage = 'Erro desconhecido na requisição';
    let details = null;

    if (axios.isAxiosError(error)) {
      if (error.response) {
        errorMessage = error.response.data?.error || 
                      error.response.data?.message || 
                      `Erro ${error.response.status}: ${error.message}`;
        details = error.response.data;
      } else if (error.request) {
        errorMessage = 'Não foi possível conectar à Evolution API. Verifique sua conexão.';
      } else {
        errorMessage = `Erro na configuração da requisição: ${error.message}`;
      }
    }
    
    log(`Erro na requisição para Evolution API: ${errorMessage}`, 'error');
    return { success: false, error: errorMessage, details };
  }
}

/**
 * Envia mensagem de texto via Evolution API
 */
export async function sendWhatsAppMessage(lead: Lead, message: string): Promise<WhatsAppResult> {
  const phoneNumber = formatPhoneNumber(lead.phone);
  if (!phoneNumber) {
    return { success: false, error: `Número de telefone inválido: ${lead.phone}` };
  }

  log(`Enviando mensagem Evolution API para ${lead.name} (${phoneNumber})`, 'info');

  try {
    const settings = await getConfigSettings();
    const { apiInstance } = settings;
    
    // Endpoint de texto da Evolution API
    const endpoint = `/message/text/${apiInstance}`;
    
    // Payload conforme documentação da Evolution API
    const payload = {
      number: phoneNumber,
      options: {
        delay: 1200, // Delay em ms (recomendado pela Evolution API)
        presence: "composing" // Mostra "digitando..." antes de enviar
      },
      textMessage: {
        text: message
      }
    };

    const result = await makeEvolutionRequest(endpoint, 'POST', payload);
    
    if (result.success) {
      log(`Mensagem enviada com sucesso via Evolution API: ${JSON.stringify(result.details)}`, 'info');
      
      // Extrair o ID da mensagem da resposta
      const messageId = result.details?.key?.id || 
                        result.details?.messageId || 
                        result.details?.id || 
                        `temp_${Date.now()}`;
      
      return { 
        success: true, 
        messageId, 
        details: result.details 
      };
    }
    
    return result;
  } catch (error) {
    log(`Erro ao enviar mensagem Evolution API: ${error}`, 'error');
    return { success: false, error: 'Erro desconhecido ao enviar mensagem', details: error };
  }
}

/**
 * Envia uma mensagem de template WhatsApp
 * Templates são mensagens pré-aprovadas pela Meta
 */
export async function sendWhatsAppTemplate(lead: Lead, templateName: string, language: string = 'pt_BR'): Promise<WhatsAppResult> {
  // Se estamos usando a Meta API diretamente (API oficial do WhatsApp)
  if (WHATSAPP_API_TOKEN) {
    const phoneNumber = formatPhoneNumber(lead.phone);
    if (!phoneNumber) {
      return { success: false, error: `Número de telefone inválido: ${lead.phone}` };
    }
    
    log(`Enviando template WhatsApp "${templateName}" para ${lead.name} (${phoneNumber})`, 'info');
    
    try {
      const response = await axios.post<WhatsAppAPIResponse>(
        `${WHATSAPP_API_URL}/${WHATSAPP_PHONE_ID}/messages`,
        {
          messaging_product: 'whatsapp',
          recipient_type: 'individual',
          to: phoneNumber,
          type: 'template',
          template: {
            name: templateName,
            language: {
              code: language
            }
          }
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${WHATSAPP_API_TOKEN}`
          },
          timeout: 10000 // 10 segundos de timeout
        }
      );

      if (response.data.messages && response.data.messages.length > 0) {
        const messageId = response.data.messages[0].id;
        log(`Template enviado com sucesso. ID: ${messageId}`, 'info');
        return { success: true, messageId, details: response.data };
      }
      
      log(`Template enviado, mas sem ID retornado`, 'warn');
      return { success: true, details: response.data };
    } catch (error) {
      log(`Erro ao enviar template WhatsApp: ${JSON.stringify(error)}`, 'error');
      let errorMessage = 'Erro desconhecido ao enviar mensagem';
      let details = null;
      
      if (axios.isAxiosError(error)) {
        if (error.response) {
          errorMessage = error.response.data?.error?.message || 
                        error.response.data?.message || 
                        `Erro ${error.response.status}: ${error.message}`;
          details = error.response.data;
        } else if (error.request) {
          errorMessage = 'Não foi possível conectar ao servidor do WhatsApp. Verifique sua conexão.';
        } else {
          errorMessage = `Erro na configuração da requisição: ${error.message}`;
        }
      }
      
      return { success: false, error: errorMessage, details };
    }
  } 
  // Caso contrário, tentamos usar a Evolution API para enviar template
  else {
    const phoneNumber = formatPhoneNumber(lead.phone);
    if (!phoneNumber) {
      return { success: false, error: `Número de telefone inválido: ${lead.phone}` };
    }

    try {
      const settings = await getConfigSettings();
      const { apiInstance } = settings;
      
      // Endpoint de template da Evolution API
      const endpoint = `/message/template/${apiInstance}`;
      
      // Payload conforme documentação da Evolution API
      const payload = {
        number: phoneNumber,
        options: {
          delay: 1200,
          presence: "composing" 
        },
        template: {
          name: templateName,
          language: {
            code: language
          }
        }
      };

      return await makeEvolutionRequest(endpoint, 'POST', payload);
    } catch (error) {
      log(`Erro ao enviar template via Evolution API: ${error}`, 'error');
      return { success: false, error: 'Erro ao enviar template', details: error };
    }
  }
}

/**
 * Checa conexão com Evolution API
 * Verifica o status da instância usando o endpoint de instância da Evolution API
 */
export async function checkWhatsAppConnection(): Promise<WhatsAppResult> {
  try {
    const settings = await getConfigSettings();
    const { apiUrl, apiToken, apiInstance } = settings;

    if (!apiUrl || !apiToken) {
      return { success: false, error: 'Configuração da Evolution API (URL ou Token) não encontrada.' };
    }

    // Para ambientes de produção, usar a URL real da sua Evolution API
    // Se estamos em ambiente de desenvolvimento e sem URL definida, tentamos simular uma resposta positiva
    if (apiUrl.includes('example.com') && process.env.NODE_ENV === 'development') {
      log('Ambiente de desenvolvimento detectado. Simulando resposta da Evolution API.', 'info');
      return {
        success: true,
        details: {
          name: 'Evolution API (Simulação)',
          phone: '+5511987654321',
          instance: apiInstance,
          status: 'CONNECTED',
          qrcode: null
        }
      };
    }

    // Endpoint específico para verificar o status da instância
    const endpoint = `/instances/instance/${apiInstance}`;
    return await makeEvolutionRequest(endpoint, 'GET');
  } catch (error) {
    log(`Erro ao verificar conexão: ${error}`, 'error');
    return { success: false, error: 'Erro ao verificar conexão com a Evolution API', details: error };
  }
}

/**
 * Envia imagem via Evolution API
 */
export async function sendWhatsAppImage(
  lead: Lead, 
  imageUrl: string, 
  caption: string = ''
): Promise<WhatsAppResult> {
  const phoneNumber = formatPhoneNumber(lead.phone);
  if (!phoneNumber) {
    return { success: false, error: `Número de telefone inválido: ${lead.phone}` };
  }

  log(`Enviando imagem para ${lead.name} (${phoneNumber})`, 'info');

  try {
    const settings = await getConfigSettings();
    const { apiInstance } = settings;
    
    // Endpoint para envio de imagem
    const endpoint = `/message/image/${apiInstance}`;
    
    // Payload conforme documentação da Evolution API
    const payload = {
      number: phoneNumber,
      options: {
        delay: 1200,
        presence: "composing"
      },
      image: {
        url: imageUrl,
        caption: caption
      }
    };

    return await makeEvolutionRequest(endpoint, 'POST', payload);
  } catch (error) {
    log(`Erro ao enviar imagem: ${error}`, 'error');
    return { success: false, error: 'Erro ao enviar imagem', details: error };
  }
}

/**
 * Envia documento via Evolution API
 */
export async function sendWhatsAppDocument(
  lead: Lead,
  documentUrl: string,
  fileName: string,
  caption: string = ''
): Promise<WhatsAppResult> {
  const phoneNumber = formatPhoneNumber(lead.phone);
  if (!phoneNumber) {
    return { success: false, error: `Número de telefone inválido: ${lead.phone}` };
  }

  log(`Enviando documento para ${lead.name} (${phoneNumber})`, 'info');

  try {
    const settings = await getConfigSettings();
    const { apiInstance } = settings;
    
    // Endpoint para envio de documento
    const endpoint = `/message/document/${apiInstance}`;
    
    // Payload conforme documentação da Evolution API
    const payload = {
      number: phoneNumber,
      options: {
        delay: 1200
      },
      document: {
        url: documentUrl,
        fileName: fileName,
        caption: caption
      }
    };

    return await makeEvolutionRequest(endpoint, 'POST', payload);
  } catch (error) {
    log(`Erro ao enviar documento: ${error}`, 'error');
    return { success: false, error: 'Erro ao enviar documento', details: error };
  }
}

/**
 * Envia áudio via Evolution API
 */
export async function sendWhatsAppAudio(
  lead: Lead,
  audioUrl: string
): Promise<WhatsAppResult> {
  const phoneNumber = formatPhoneNumber(lead.phone);
  if (!phoneNumber) {
    return { success: false, error: `Número de telefone inválido: ${lead.phone}` };
  }

  log(`Enviando áudio para ${lead.name} (${phoneNumber})`, 'info');

  try {
    const settings = await getConfigSettings();
    const { apiInstance } = settings;
    
    // Endpoint para envio de áudio
    const endpoint = `/message/audio/${apiInstance}`;
    
    // Payload conforme documentação da Evolution API
    const payload = {
      number: phoneNumber,
      options: {
        delay: 1200
      },
      audio: {
        url: audioUrl
      }
    };

    return await makeEvolutionRequest(endpoint, 'POST', payload);
  } catch (error) {
    log(`Erro ao enviar áudio: ${error}`, 'error');
    return { success: false, error: 'Erro ao enviar áudio', details: error };
  }
}

/**
 * Envia vídeo via Evolution API
 */
export async function sendWhatsAppVideo(
  lead: Lead,
  videoUrl: string,
  caption: string = ''
): Promise<WhatsAppResult> {
  const phoneNumber = formatPhoneNumber(lead.phone);
  if (!phoneNumber) {
    return { success: false, error: `Número de telefone inválido: ${lead.phone}` };
  }

  log(`Enviando vídeo para ${lead.name} (${phoneNumber})`, 'info');

  try {
    const settings = await getConfigSettings();
    const { apiInstance } = settings;
    
    // Endpoint para envio de vídeo
    const endpoint = `/message/video/${apiInstance}`;
    
    // Payload conforme documentação da Evolution API
    const payload = {
      number: phoneNumber,
      options: {
        delay: 1200
      },
      video: {
        url: videoUrl,
        caption: caption
      }
    };

    return await makeEvolutionRequest(endpoint, 'POST', payload);
  } catch (error) {
    log(`Erro ao enviar vídeo: ${error}`, 'error');
    return { success: false, error: 'Erro ao enviar vídeo', details: error };
  }
}

/**
 * Obtém o QR Code para conexão do WhatsApp
 */
export async function getWhatsAppQRCode(): Promise<WhatsAppResult> {
  try {
    const settings = await getConfigSettings();
    const { apiInstance } = settings;
    
    // Primeiro, verificamos se já existe uma instância conectada
    const statusResult = await makeEvolutionRequest(`/instances/instance/${apiInstance}`, 'GET');
    
    if (statusResult.success && statusResult.details?.status === 'open') {
      // Se já estiver conectado, não precisamos de QR Code
      return {
        success: true,
        details: {
          connected: true,
          message: 'WhatsApp já está conectado',
          instance: statusResult.details
        }
      };
    }
    
    // Se não estiver conectado ou em estado inválido, geramos novo QR Code
    const qrResult = await makeEvolutionRequest(`/instances/qrcode/${apiInstance}`, 'GET');
    
    if (!qrResult.success) {
      return qrResult;
    }

    return {
      success: true,
      details: {
        connected: false,
        qrcode: qrResult.details?.qrcode,
        message: 'Escaneie o QR Code para conectar'
      }
    };
  } catch (error) {
    log(`Erro ao obter QR Code: ${error}`, 'error');
    return { success: false, error: 'Erro ao obter QR Code', details: error };
  }
}

/**
 * Verifica o status de uma mensagem
 */
export async function checkMessageStatus(messageId: string): Promise<WhatsAppResult> {
  if (!messageId) {
    return { success: false, error: 'ID da mensagem não fornecido' };
  }
  
  try {
    const settings = await getConfigSettings();
    const { apiInstance } = settings;
    
    // Endpoint para verificar status de mensagem
    const endpoint = `/message/statusMessage/${apiInstance}/${messageId}`;
    
    const result = await makeEvolutionRequest(endpoint, 'GET');
    
    if (!result.success) {
      return result;
    }
    
    // Normalizar o status da mensagem com base na resposta da Evolution API
    let normalizedStatus = 'sent'; // Default
    const rawStatus = result.details?.status || '';
    
    // Mapeamento de status da Evolution API para nosso sistema
    switch (rawStatus.toLowerCase()) {
      case 'pending':
      case 'sending':
        normalizedStatus = 'pending';
        break;
      case 'sent':
        normalizedStatus = 'sent';
        break;
      case 'received':
      case 'delivered':
        normalizedStatus = 'delivered';
        break;
      case 'read':
        normalizedStatus = 'read';
        break;
      case 'failed':
      case 'error':
        normalizedStatus = 'failed';
        break;
      default:
        normalizedStatus = 'sent'; // Fallback
    }
    
    return {
      success: true,
      details: {
        status: normalizedStatus,
        originalStatus: rawStatus,
        timestamp: result.details?.timestamp || new Date().toISOString()
      }
    };
  } catch (error) {
    log(`Erro ao verificar status de mensagem ${messageId}: ${error}`, 'error');
    return { success: false, error: 'Erro ao verificar status da mensagem', details: error };
  }
}

/**
 * Formata o número de telefone para o formato esperado pelo WhatsApp
 */
export function formatPhoneNumber(phoneNumber: string | null | undefined): string | null {
  if (!phoneNumber) return null;
  
  // Remove todos os caracteres não numéricos
  let cleaned = phoneNumber.replace(/\D/g, '');
  
  // Se começar com 0, remove
  if (cleaned.startsWith('0')) {
    cleaned = cleaned.substring(1);
  }
  
  // Se for brasileiro e não começa com 55, adiciona o código do Brasil
  if (!cleaned.startsWith('55') && cleaned.length <= 11) {
    cleaned = '55' + cleaned;
  }
  
  // Verifica se o número tem pelo menos 10 dígitos (mínimo para um número de telefone válido)
  if (cleaned.length < 10) {
    return null;
  }
  
  return cleaned;
}

/**
 * Salva as configurações da Evolution API
 */
export async function saveConfigSettings(apiUrl: string, apiToken?: string, apiInstance = 'default'): Promise<WhatsAppResult> {
  try {
    // Normaliza a URL da API (remove a barra final se existir)
    let normalizedUrl = apiUrl.trim();
    if (normalizedUrl.endsWith('/')) {
      normalizedUrl = normalizedUrl.slice(0, -1);
    }
    
    // Se não começa com http:// ou https://, adiciona https://
    if (!normalizedUrl.startsWith('http://') && !normalizedUrl.startsWith('https://')) {
      normalizedUrl = 'https://' + normalizedUrl;
    }

    // Se não temos o token atual e não foi fornecido um novo, retorna erro
    if (!apiToken) {
      const existingSettings = await storage.getWhatsappSettings();
      if (!existingSettings?.apiToken) {
        return { success: false, error: 'Token da API é obrigatório para configuração inicial' };
      }
      
      // Se já temos um token no banco, vamos usar ele
      await storage.saveWhatsappSettings({
        apiUrl: normalizedUrl,
        apiToken: existingSettings.apiToken,
        apiInstance: apiInstance || 'default'
      });
    } else {
      // Caso contrário, salvamos com o novo token
      await storage.saveWhatsappSettings({
        apiUrl: normalizedUrl,
        apiToken,
        apiInstance: apiInstance || 'default'
      });
    }

    return { success: true, details: { apiUrl: normalizedUrl, apiInstance, hasToken: true } };
  } catch (error) {
    log(`Erro ao salvar configurações: ${error}`, 'error');
    return { success: false, error: 'Erro ao salvar configurações', details: error };
  }
}

/**
 * Obtém as configurações da Evolution API
 */
export async function getConfigSettings(): Promise<any> {
  try {
    const config = await storage.getWhatsappSettings();
    
    // Valores default quando não configurado
    return {
      apiUrl: config?.apiUrl || process.env.EVOLUTION_API_URL || '',
      apiToken: config?.apiToken || process.env.EVOLUTION_API_TOKEN || '',
      apiInstance: config?.apiInstance || process.env.EVOLUTION_API_INSTANCE || 'default',
      hasToken: !!config?.apiToken || !!process.env.EVOLUTION_API_TOKEN,
      lastUpdated: config?.updatedAt
    };
  } catch (error) {
    log(`Erro ao obter configurações: ${error}`, 'error');
    // Retorna valores default
    return {
      apiUrl: process.env.EVOLUTION_API_URL || '',
      apiToken: process.env.EVOLUTION_API_TOKEN || '',
      apiInstance: process.env.EVOLUTION_API_INSTANCE || 'default',
      hasToken: !!process.env.EVOLUTION_API_TOKEN,
      lastUpdated: null
    };
  }
}

// Nova função para obter grupos disponíveis
export async function getWhatsAppGroups(): Promise<WhatsAppResult> {
  try {
    const settings = await getConfigSettings();
    const { apiInstance } = settings;
    
    // Endpoint para obter grupos
    const endpoint = `/group/fetchAllGroups/${apiInstance}`;
    
    return await makeEvolutionRequest(endpoint, 'GET');
  } catch (error) {
    log(`Erro ao buscar grupos: ${error}`, 'error');
    return { success: false, error: 'Erro ao buscar grupos', details: error };
  }
}

// Nova função para criar um grupo
export async function createWhatsAppGroup(
  name: string, 
  participants: string[]
): Promise<WhatsAppResult> {
  try {
    const settings = await getConfigSettings();
    const { apiInstance } = settings;
    
    // Endpoint para criar grupo
    const endpoint = `/group/create/${apiInstance}`;
    
    // Prepare phone numbers in array
    const formattedParticipants = participants.map(p => formatPhoneNumber(p)).filter(Boolean);
    
    if (formattedParticipants.length === 0) {
      return { success: false, error: 'É necessário pelo menos um participante válido' };
    }
    
    const payload = {
      subject: name,
      participants: formattedParticipants
    };
    
    return await makeEvolutionRequest(endpoint, 'POST', payload);
  } catch (error) {
    log(`Erro ao criar grupo: ${error}`, 'error');
    return { success: false, error: 'Erro ao criar grupo', details: error };
  }
}

// Nova função para obter os contatos
export async function getWhatsAppContacts(): Promise<WhatsAppResult> {
  try {
    const settings = await getConfigSettings();
    const { apiInstance } = settings;
    
    // Endpoint para obter contatos
    const endpoint = `/contact/get-all/${apiInstance}`;
    
    return await makeEvolutionRequest(endpoint, 'GET');
  } catch (error) {
    log(`Erro ao buscar contatos: ${error}`, 'error');
    return { success: false, error: 'Erro ao buscar contatos', details: error };
  }
}
