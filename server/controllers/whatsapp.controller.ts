import type { Request, Response } from "express";
import { db } from "../db";
import { storage } from "../storage";
import { leads, whatsappMessages, type WhatsappMessage } from "@shared/schema"; // Ensure whatsappMessages table schema is imported if needed for raw query
import { sql } from 'drizzle-orm';
import { normalizePhone } from "../utils/lead.utils"; // Import normalizePhone
import { 
  sendWhatsAppMessage, 
  sendWhatsAppTemplate, 
  checkWhatsAppConnection, 
  formatPhoneNumber, 
  sendWhatsAppImage,
  getWhatsAppQRCode,
  checkMessageStatus,
  saveConfigSettings,
  getConfigSettings,
  sendWhatsAppDocument,
  sendWhatsAppAudio,
  sendWhatsAppVideo,
  getWhatsAppGroups,
  createWhatsAppGroup,
  getWhatsAppContacts
} from "../whatsapp-service"; // Adjust path if needed

// Helper to get lead or return 404
const findLeadOr404 = async (leadId: number, res: Response) => {
  if (isNaN(leadId)) {
    res.status(400).json({ message: "ID do lead inválido" });
    return null;
  }
  const lead = await storage.getLead(leadId);
  if (!lead) {
    res.status(404).json({ message: "Lead não encontrado" });
    return null;
  }
  return lead;
};

// Obter todas as mensagens de um lead específico
export const getLeadMessages = async (req: Request, res: Response) => {
  try {
    const leadId = parseInt(req.params.leadId || req.params.id); // Handle potential differences in param name initially
    const lead = await findLeadOr404(leadId, res);
    if (!lead) return;

    const messages = await storage.getWhatsappMessages(leadId);
    // Sort chronologically for display
    messages.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
    res.json(messages);
  } catch (error) {
    console.error('Erro ao buscar mensagens de WhatsApp do lead:', error);
    res.status(500).json({ message: "Erro ao buscar mensagens de WhatsApp" });
  }
};

// Atualizar status de uma mensagem específica
export const updateMessageStatus = async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
       return res.status(400).json({ message: "ID da mensagem inválido" });
    }
    const { status } = req.body;
    if (!status || !['sent', 'delivered', 'read', 'failed', 'received', 'pending'].includes(status)) { // Added 'received', 'pending'
      return res.status(400).json({ message: "Status inválido" });
    }
    const updatedMessage = await storage.updateWhatsappMessageStatus(id, status);
    if (!updatedMessage) {
      return res.status(404).json({ message: "Mensagem não encontrada" });
    }
    res.json(updatedMessage);
  } catch (error) {
    console.error('Erro ao atualizar status da mensagem:', error);
    res.status(500).json({ message: "Erro ao atualizar status da mensagem" });
  }
};

// Excluir uma mensagem específica
export const deleteMessage = async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
     if (isNaN(id)) {
       return res.status(400).json({ message: "ID da mensagem inválido" });
    }
    const success = await storage.deleteWhatsappMessage(id);
    if (!success) {
      return res.status(404).json({ message: "Mensagem não encontrada" });
    }
    res.status(204).send();
  } catch (error) {
    console.error('Erro ao excluir mensagem:', error);
    res.status(500).json({ message: "Erro ao excluir mensagem" });
  }
};

// Obter as mensagens mais recentes para cada lead
export const getRecentMessagesPerLead = async (req: Request, res: Response) => {
  try {
    // Using raw query as storage.getRecentWhatsappMessagesPerLead doesn't exist
    const query = sql`
      SELECT DISTINCT ON (lead_id) *
      FROM ${whatsappMessages}
      ORDER BY lead_id, timestamp DESC
    `;
    
    // Use 'any' or a more specific type based on your DB driver's return for raw queries
    const result: any = await db.execute(query); 
    
    const messagesByLead: Record<number, WhatsappMessage> = {};

    // Check if the result has a 'rows' property (common pattern)
    const rows = result?.rows || result; // Adjust based on driver

    if (Array.isArray(rows)) {
         rows.forEach((message: WhatsappMessage) => { // Assume rows are WhatsappMessage objects
             if (message && typeof message.leadId === 'number') { // Basic validation
                 messagesByLead[message.leadId] = message;
             }
         });
    } else {
         console.error("Unexpected result structure from DB query for recent messages:", result);
    }
    res.json(messagesByLead);

  } catch (error) {
    console.error('Erro ao buscar mensagens recentes:', error);
    res.status(500).json({ message: "Erro ao buscar mensagens recentes" });
  }
};


// Verificar conexão com a API do WhatsApp
export const getWhatsappStatus = async (req: Request, res: Response) => {
  try {
    const connectionStatus = await checkWhatsAppConnection();
    if (connectionStatus.success) {
      res.json({ 
        status: 'connected', 
        message: 'Conexão com a API do WhatsApp está funcionando corretamente',
        details: connectionStatus.details || {}
      });
    } else {
      console.warn(`Falha na verificação da conexão WhatsApp: ${connectionStatus.error}`);
      res.status(503).json({ 
        status: 'disconnected', 
        message: connectionStatus.error || 'Falha na conexão com a API do WhatsApp',
        details: connectionStatus.details || {}
      });
    }
  } catch (error: any) {
    console.error(`Erro ao verificar status da API: ${error.message}`, error);
    res.status(500).json({ status: 'error', message: 'Erro ao verificar conexão com a API do WhatsApp' });
  }
};

// Obter configuração da API do WhatsApp
export const getWhatsappConfig = async (req: Request, res: Response) => {
  try {
    const configSettings = await getConfigSettings();
    res.json(configSettings);
  } catch (error: any) {
    console.error('Erro ao obter configurações do WhatsApp:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Erro ao obter configurações do WhatsApp',
      error: error.message || String(error)
    });
  }
};

// Salvar configuração da API do WhatsApp
export const saveWhatsappConfig = async (req: Request, res: Response) => {
  try {
    const { apiUrl, apiToken, apiInstance } = req.body;
    if (!apiUrl) { // Basic validation
      return res.status(400).json({ success: false, message: 'URL da API é obrigatória' });
    }
    const result = await saveConfigSettings(apiUrl, apiToken, apiInstance);
    if (result.success) {
      res.json({ success: true, message: 'Configurações salvas com sucesso', details: result.details });
    } else {
      res.status(400).json({ success: false, message: result.error || 'Falha ao salvar configurações', details: result.details });
    }
  } catch (error: any) {
    console.error('Erro ao salvar configurações do WhatsApp:', error);
    res.status(500).json({ success: false, message: 'Erro interno ao salvar configurações', error: error.message || String(error) });
  }
};

// Obter QR Code para conexão
export const getQRCode = async (req: Request, res: Response) => {
  try {
    const qrCodeResult = await getWhatsAppQRCode();
    if (qrCodeResult.success) {
      res.json({ success: true, details: qrCodeResult.details });
    } else {
      console.warn(`Falha ao obter QR code: ${qrCodeResult.error}`);
      res.status(400).json({ success: false, message: qrCodeResult.error || 'Falha ao obter QR code', details: qrCodeResult.details });
    }
  } catch (error: any) {
    console.error('Erro ao gerar QR code:', error);
    res.status(500).json({ success: false, message: 'Erro interno ao gerar QR code', error: error.message || String(error) });
  }
};

// Verificar status de uma mensagem enviada via API
export const checkApiMessageStatus = async (req: Request, res: Response) => {
  try {
    const { messageId } = req.params;
    if (!messageId) {
      return res.status(400).json({ success: false, message: 'ID da mensagem é obrigatório' });
    }
    
    const message = await storage.getWhatsappMessageByApiId(messageId);
    const statusResult = await checkMessageStatus(messageId);
    
    let updated = false;
    let previousStatus = message?.status;

    if (statusResult.success && message && statusResult.details?.status) {
      const newStatus = statusResult.details.status;
      if (message.status !== newStatus) {
        await storage.updateWhatsappMessageStatus(message.id, newStatus);
        updated = true;
      }
    }

    if (statusResult.success) {
       res.json({ 
          success: true, 
          status: statusResult.details?.status || 'sent', // Default to 'sent' if API doesn't return status?
          originalStatus: statusResult.details?.originalStatus,
          timestamp: statusResult.details?.timestamp,
          message: message ? { // Include info about the message in our DB
            id: message.id,
            leadId: message.leadId,
            previousStatus: previousStatus, // Status before this check
            updated: updated // Did the status change in our DB?
          } : null
        });
    } else {
      console.warn(`Falha ao verificar status da mensagem API ${messageId}: ${statusResult.error}`);
      res.status(400).json({ 
        success: false, 
        message: statusResult.error || 'Falha ao verificar status da mensagem',
        details: statusResult.details || {},
        messageId: messageId
      });
    }
  } catch (error: any) {
    console.error('Erro ao verificar status da mensagem API:', error);
    res.status(500).json({ success: false, message: 'Erro interno ao verificar status da mensagem API', error: error.message || String(error) });
  }
};

// Enviar mensagem de texto
export const sendTextMessage = async (req: Request, res: Response) => {
  try {
    const { leadId, content, direction, status } = req.body;
    if (!leadId || !content) {
      return res.status(400).json({ message: "ID do lead e conteúdo são obrigatórios" });
    }

    const lead = await findLeadOr404(leadId, res);
    if (!lead) return;

    const formattedPhone = formatPhoneNumber(lead.phone);
    if (!formattedPhone) {
      return res.status(400).json({ message: "Número de telefone inválido ou não encontrado para o lead" });
    }

    const messageData: Omit<WhatsappMessage, 'id' | 'timestamp'> = { // Type for insertion
      leadId,
      direction: direction === 'incoming' ? 'incoming' : 'outgoing',
      content,
      status: direction === 'incoming' ? (status || 'received') : 'pending', // Default incoming to received, outgoing to pending
      mediaUrl: null,
      mediaType: null,
      messageId: null // API message ID will be updated later
    };

    const message = await storage.createWhatsappMessage(messageData);

    if (messageData.direction === 'outgoing') {
      const result = await sendWhatsAppMessage(lead, content);
      if (result.success) {
        const finalStatus = 'sent';
        await storage.updateWhatsappMessageStatus(message.id, finalStatus);
        if (result.messageId) {
          await storage.updateWhatsappMessageId(message.id, result.messageId);
        }
        res.status(201).json({ ...message, status: finalStatus, messageId: result.messageId, success: true });
      } else {
        const finalStatus = 'failed';
        await storage.updateWhatsappMessageStatus(message.id, finalStatus);
        const errorMessage = result.error || 'Erro desconhecido';
        const isNotAuthorizedNumber = errorMessage.includes('not in allowed list');
        res.status(400).json({ ...message, status: finalStatus, error: errorMessage, unauthorizedNumber: isNotAuthorizedNumber, success: false });
      }
    } else {
      // If direction was explicitly 'incoming', just confirm it was saved
      res.status(201).json({ ...message, success: true });
    }
  } catch (error: any) {
    console.error('Erro ao enviar mensagem WhatsApp:', error);
    res.status(500).json({ message: "Erro ao enviar mensagem", error: error.message || String(error) });
  }
};

// Enviar imagem
export const sendImageMessage = async (req: Request, res: Response) => {
  try {
    const { leadId, imageUrl, caption } = req.body;
    if (!leadId || !imageUrl) {
      return res.status(400).json({ message: "ID do lead e URL da imagem são obrigatórios" });
    }

    const lead = await findLeadOr404(leadId, res);
    if (!lead) return;

    const formattedPhone = formatPhoneNumber(lead.phone);
    if (!formattedPhone) {
      return res.status(400).json({ message: "Número de telefone inválido ou não encontrado para o lead" });
    }

    const messageData: Omit<WhatsappMessage, 'id' | 'timestamp'> = {
      leadId,
      direction: 'outgoing',
      content: caption || '[Imagem enviada]',
      status: 'pending',
      mediaUrl: imageUrl,
      mediaType: 'image',
      messageId: null
    };

    const message = await storage.createWhatsappMessage(messageData);
    const result = await sendWhatsAppImage(lead, imageUrl, caption || '');

    if (result.success) {
      const finalStatus = 'sent';
      await storage.updateWhatsappMessageStatus(message.id, finalStatus);
      if (result.messageId) {
        await storage.updateWhatsappMessageId(message.id, result.messageId);
      }
      res.status(201).json({ ...message, status: finalStatus, messageId: result.messageId, success: true });
    } else {
      const finalStatus = 'failed';
      await storage.updateWhatsappMessageStatus(message.id, finalStatus);
      const errorMessage = result.error || 'Erro desconhecido';
      const isNotAuthorizedNumber = errorMessage.includes('not in allowed list');
      console.error(`Falha ao enviar imagem WhatsApp: ${errorMessage}`);
      res.status(400).json({ ...message, status: finalStatus, error: errorMessage, unauthorizedNumber: isNotAuthorizedNumber, success: false });
    }
  } catch (error: any) {
    console.error('Erro ao enviar imagem WhatsApp:', error);
    res.status(500).json({ message: "Erro ao enviar imagem", error: error.message || String(error) });
  }
};

// Enviar template
export const sendTemplateMessage = async (req: Request, res: Response) => {
  try {
    const { leadId, templateName, language } = req.body;
    if (!leadId || !templateName) {
      return res.status(400).json({ message: "ID do lead e nome do template são obrigatórios" });
    }

    const lead = await findLeadOr404(leadId, res);
    if (!lead) return;

    const messageData: Omit<WhatsappMessage, 'id' | 'timestamp'> = {
      leadId,
      direction: 'outgoing',
      content: `Template: ${templateName}`, // Store template name as content for reference
      status: 'pending',
      mediaUrl: null,
      mediaType: 'template', // Add a type for templates?
      messageId: null
    };

    const message = await storage.createWhatsappMessage(messageData);
    const result = await sendWhatsAppTemplate(lead, templateName, language || 'pt_BR');

    if (result.success) {
       const finalStatus = 'sent';
      await storage.updateWhatsappMessageStatus(message.id, finalStatus);
      if (result.messageId) {
        await storage.updateWhatsappMessageId(message.id, result.messageId);
      }
       res.status(201).json({ ...message, status: finalStatus, messageId: result.messageId, success: true }); // Return full message object
    } else {
       const finalStatus = 'failed';
      await storage.updateWhatsappMessageStatus(message.id, finalStatus);
      console.error(`Falha ao enviar template WhatsApp: ${result.error}`); // Log error
      res.status(400).json({ ...message, status: finalStatus, error: result.error || 'Erro ao enviar template', success: false }); // Return full message object
    }
  } catch (error: any) {
    console.error('Erro ao enviar template WhatsApp:', error);
    res.status(500).json({ message: "Erro ao enviar template WhatsApp", error: error.message || String(error) });
  }
};

// Manipulador de Webhook (POST) - Tenta lidar com Meta e Evolution API
export const handleWebhook = async (req: Request, res: Response) => {
  try {
    const data = req.body;
    console.log('Webhook POST recebido:', JSON.stringify(data, null, 2));

    // --- Tentativa de Processamento - Formato Meta ---
    if (data?.object === 'whatsapp_business_account' && data?.entry && Array.isArray(data.entry)) {
      console.log("Detectado formato de webhook Meta");
      for (const entry of data.entry) {
        if (!entry.changes || !Array.isArray(entry.changes)) continue;
        for (const change of entry.changes) {
          if (change.field !== 'messages') continue;
          const value = change.value;

          // Processar mensagens recebidas
          if (value?.messages && Array.isArray(value.messages)) {
            for (const message of value.messages) {
              // Só processar mensagens de texto recebidas (ignorar enviadas pelo sistema/echo)
              if (message.from && message.id && message.type === 'text') { // Basic check for incoming text
                const phoneNumber = message.from;
                const messageContent = message.text?.body || '';
                const messageId = message.id;

                const cleanPhone = normalizePhone(phoneNumber); // Use imported utility function
                const leadsFound = await storage.getLeadsByPhone(cleanPhone); // Assumes storage has this method
                
                if (!leadsFound || leadsFound.length === 0) {
                  console.warn(`[Meta Webhook] Mensagem recebida de número não cadastrado: ${phoneNumber}`);
                  continue; // Skip if lead not found
                }
                const lead = leadsFound[0]; // Use the first match

                await storage.createWhatsappMessage({
                  leadId: lead.id,
                  direction: 'incoming',
                  content: messageContent,
                  status: 'received', // Or 'read' if applicable? Check Meta docs
                  messageId: messageId, // Store Meta's message ID
                  mediaUrl: null,
                  mediaType: message.type, // Store 'text'
                });
                console.log(`[Meta Webhook] Mensagem recebida de ${lead.name} (${phoneNumber}) salva.`);
              } else {
                 console.log(`[Meta Webhook] Ignorando mensagem não-texto ou sem remetente: ${message.id}`);
              }
            }
          }

           // Processar atualizações de status de mensagens enviadas
          if (value?.statuses && Array.isArray(value.statuses)) {
             for (const statusUpdate of value.statuses) {
                 if (statusUpdate.id && statusUpdate.status) { // Check if we have API message ID and new status
                    const apiMessageId = statusUpdate.id;
                    const newStatus = statusUpdate.status; // e.g., 'sent', 'delivered', 'read', 'failed'

                    const message = await storage.getWhatsappMessageByApiId(apiMessageId);
                    if (message) {
                       if (message.status !== newStatus) {
                           console.log(`[Meta Webhook] Atualizando status da mensagem ID ${message.id} (API ID: ${apiMessageId}) de ${message.status} para ${newStatus}`);
                           await storage.updateWhatsappMessageStatus(message.id, newStatus);
                       }
                    } else {
                       console.warn(`[Meta Webhook] Recebido status para mensagem API desconhecida: ${apiMessageId}`);
                    }
                 }
             }
          }
        }
      }
      return res.status(200).send('EVENT_RECEIVED'); // Specific response for Meta
    }

    // --- Tentativa de Processamento - Formato Evolution API ---
    // Example check - adjust based on actual Evolution API webhook structure
    if (data?.event === 'messages.upsert' || data?.event === 'messages.update' || data?.appId) { 
      console.log("Detectado formato de webhook Evolution API (ou similar)");
      const event = data.event;
      const messageData = data.data || data.message; // Structure might vary

       // Mensagem Recebida (Evolution Example)
      if ((event === 'messages.upsert' || data.type === 'message') && messageData) {
        const from = messageData?.key?.remoteJid || messageData?.sender || data.from; // Adjust based on actual payload
        const content = messageData?.message?.conversation || messageData?.message?.extendedTextMessage?.text || messageData?.body || messageData?.caption || '[Mensagem sem texto]';
        const messageId = messageData?.key?.id || data.messageId || `incoming_${Date.now()}`; // Adjust based on actual payload
        const mediaUrl = messageData?.mediaUrl || messageData?.url; // Adjust
        const mediaType = messageData?.mediaType || (mediaUrl ? 'image' : null); // Adjust

        if (!from) {
          console.warn('[Evolution Webhook] Número de origem não encontrado');
          return res.status(400).json({ success: false, message: 'Número de origem não encontrado' });
        }
        
        // Find lead by phone number (use normalizePhone and potentially more robust matching)
        const cleanPhone = normalizePhone(from); // Use imported utility function
        const leadsFound = await storage.getLeadsByPhone(cleanPhone); // Assumes storage has this method
        
        if (!leadsFound || leadsFound.length === 0) {
           console.warn(`[Evolution Webhook] Mensagem recebida de número não cadastrado: ${from} (Normalizado: ${cleanPhone})`);
           // Optionally create a new lead here? Or just ignore.
           return res.status(404).json({ success: false, message: 'Lead não encontrado' }); 
        }

        const lead = leadsFound[0]; // Use first match
        await storage.createWhatsappMessage({
          leadId: lead.id,
          direction: 'incoming',
          content,
          status: 'received', 
          messageId, // Store Evolution API's message ID if available
          mediaUrl: mediaUrl || null,
          mediaType: mediaType || null
        });
        console.log(`[Evolution Webhook] Mensagem recebida de ${lead.name} (${from}) salva.`);
        return res.status(201).json({ success: true, message: 'Mensagem recebida salva', leadId: lead.id });
      }
      
      // Atualização de Status (Evolution Example)
      else if (event === 'messages.update' || data.type === 'status') {
          const apiMessageId = data.messageId || data.id; // Adjust field names
          const status = data.status?.status || data.status || data.update?.status || 'unknown'; // Adjust field names
          const validStatuses = ['sent', 'delivered', 'read', 'failed', 'pending', 'received']; // Add Evolution statuses

          if (!apiMessageId) {
              console.warn('[Evolution Webhook] ID da mensagem não encontrado na atualização de status');
              return res.status(400).json({ success: false, message: 'ID da mensagem não encontrado' });
          }

          const message = await storage.getWhatsappMessageByApiId(apiMessageId);
          if (!message) {
              console.warn(`[Evolution Webhook] Recebido status para mensagem API desconhecida: ${apiMessageId}`);
              return res.status(404).json({ success: false, message: 'Mensagem não encontrada' });
          }

          if (validStatuses.includes(status) && message.status !== status) {
               console.log(`[Evolution Webhook] Atualizando status da mensagem ID ${message.id} (API ID: ${apiMessageId}) de ${message.status} para ${status}`);
              await storage.updateWhatsappMessageStatus(message.id, status);
              return res.json({ success: true, message: 'Status atualizado', previousStatus: message.status, newStatus: status });
          } else {
               console.log(`[Evolution Webhook] Status ${status} inválido ou inalterado para mensagem API ${apiMessageId}`);
               return res.json({ success: false, message: 'Status inválido ou inalterado' }); // Or 200 OK?
          }
      }
      
      // Fallback for other Evolution events
      else {
         console.log(`[Evolution Webhook] Evento recebido: ${event || 'Tipo desconhecido'}`);
          return res.json({ success: true, message: 'Evento Evolution recebido', eventType: event || data.type });
      }
    }

    // --- Nenhum formato conhecido ---
    console.warn('Webhook POST recebido com formato não reconhecido:', JSON.stringify(data));
    res.status(400).json({ message: 'Formato de webhook não reconhecido' });

  } catch (error: any) {
    console.error('Erro ao processar webhook WhatsApp POST:', error);
    res.status(500).json({ success: false, message: 'Erro interno ao processar webhook', error: error.message || String(error) });
  }
};

// Manipulador de Verificação de Webhook (GET) - Específico para Meta
export const verifyWebhook = (req: Request, res: Response) => {
  console.log('Webhook GET recebido para verificação:', req.query);
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  // Use o token do .env ou um valor padrão seguro
  const verifyToken = process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN || 'DEFINE_YOUR_SECURE_TOKEN_IN_ENV'; 

  if (mode === 'subscribe' && token === verifyToken) {
    console.log('Webhook Meta verificado com sucesso!');
    res.status(200).send(challenge);
  } else {
    console.warn('Falha na verificação do webhook Meta - Token inválido ou modo incorreto.');
    res.sendStatus(403); // Forbidden
  }
};

// Enviar documento via WhatsApp
export const sendDocumentMessage = async (req: Request, res: Response) => {
  try {
    const { leadId, documentUrl, fileName, caption } = req.body;
    if (!documentUrl || !fileName) {
      return res.status(400).json({ 
        success: false, 
        message: 'URL do documento e nome do arquivo são obrigatórios' 
      });
    }

    const lead = await findLeadOr404(parseInt(leadId), res);
    if (!lead) return;

    const result = await sendWhatsAppDocument(lead, documentUrl, fileName, caption || '');
    
    if (result.success) {
      // Salvar a mensagem no banco de dados
      const message = await storage.createWhatsappMessage({
        leadId: lead.id,
        direction: 'outgoing',
        content: caption || fileName,
        status: 'sent',
        mediaUrl: documentUrl,
        mediaType: 'document',
        messageId: result.messageId
      });
      
      res.status(201).json({
        success: true,
        message: 'Documento enviado com sucesso',
        details: message
      });
    } else {
      res.status(400).json({
        success: false,
        message: result.error || 'Falha ao enviar documento',
        details: result.details
      });
    }
  } catch (error: any) {
    console.error('Erro ao enviar documento via WhatsApp:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Erro interno ao enviar documento'
    });
  }
};

// Enviar áudio via WhatsApp
export const sendAudioMessage = async (req: Request, res: Response) => {
  try {
    const { leadId, audioUrl } = req.body;
    if (!audioUrl) {
      return res.status(400).json({ 
        success: false, 
        message: 'URL do áudio é obrigatória' 
      });
    }

    const lead = await findLeadOr404(parseInt(leadId), res);
    if (!lead) return;

    const result = await sendWhatsAppAudio(lead, audioUrl);
    
    if (result.success) {
      // Salvar a mensagem no banco de dados
      const message = await storage.createWhatsappMessage({
        leadId: lead.id,
        direction: 'outgoing',
        content: 'Áudio',
        status: 'sent',
        mediaUrl: audioUrl,
        mediaType: 'audio',
        messageId: result.messageId
      });
      
      res.status(201).json({
        success: true,
        message: 'Áudio enviado com sucesso',
        details: message
      });
    } else {
      res.status(400).json({
        success: false,
        message: result.error || 'Falha ao enviar áudio',
        details: result.details
      });
    }
  } catch (error: any) {
    console.error('Erro ao enviar áudio via WhatsApp:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Erro interno ao enviar áudio'
    });
  }
};

// Enviar vídeo via WhatsApp
export const sendVideoMessage = async (req: Request, res: Response) => {
  try {
    const { leadId, videoUrl, caption } = req.body;
    if (!videoUrl) {
      return res.status(400).json({ 
        success: false, 
        message: 'URL do vídeo é obrigatória' 
      });
    }

    const lead = await findLeadOr404(parseInt(leadId), res);
    if (!lead) return;

    const result = await sendWhatsAppVideo(lead, videoUrl, caption || '');
    
    if (result.success) {
      // Salvar a mensagem no banco de dados
      const message = await storage.createWhatsappMessage({
        leadId: lead.id,
        direction: 'outgoing',
        content: caption || 'Vídeo',
        status: 'sent',
        mediaUrl: videoUrl,
        mediaType: 'video',
        messageId: result.messageId
      });
      
      res.status(201).json({
        success: true,
        message: 'Vídeo enviado com sucesso',
        details: message
      });
    } else {
      res.status(400).json({
        success: false,
        message: result.error || 'Falha ao enviar vídeo',
        details: result.details
      });
    }
  } catch (error: any) {
    console.error('Erro ao enviar vídeo via WhatsApp:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Erro interno ao enviar vídeo'
    });
  }
};

// Obter grupos do WhatsApp
export const getWhatsappGroups = async (req: Request, res: Response) => {
  try {
    const result = await getWhatsAppGroups();
    
    if (result.success) {
      res.json({
        success: true,
        groups: result.details?.groups || []
      });
    } else {
      res.status(400).json({
        success: false,
        message: result.error || 'Falha ao obter grupos',
        details: result.details
      });
    }
  } catch (error: any) {
    console.error('Erro ao obter grupos de WhatsApp:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Erro interno ao obter grupos'
    });
  }
};

// Criar um grupo de WhatsApp
export const createWhatsappGroup = async (req: Request, res: Response) => {
  try {
    const { name, participants } = req.body;
    
    if (!name || !participants || !Array.isArray(participants) || participants.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Nome e pelo menos um participante são obrigatórios'
      });
    }
    
    const result = await createWhatsAppGroup(name, participants);
    
    if (result.success) {
      res.status(201).json({
        success: true,
        message: 'Grupo criado com sucesso',
        details: result.details
      });
    } else {
      res.status(400).json({
        success: false,
        message: result.error || 'Falha ao criar grupo',
        details: result.details
      });
    }
  } catch (error: any) {
    console.error('Erro ao criar grupo de WhatsApp:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Erro interno ao criar grupo'
    });
  }
};

// Obter contatos do WhatsApp
export const getWhatsappContacts = async (req: Request, res: Response) => {
  try {
    const result = await getWhatsAppContacts();
    
    if (result.success) {
      res.json({
        success: true,
        contacts: result.details?.contacts || []
      });
    } else {
      res.status(400).json({
        success: false,
        message: result.error || 'Falha ao obter contatos',
        details: result.details
      });
    }
  } catch (error: any) {
    console.error('Erro ao obter contatos de WhatsApp:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Erro interno ao obter contatos'
    });
  }
}; 