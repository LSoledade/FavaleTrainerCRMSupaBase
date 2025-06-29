import { Router } from 'express';
import { isAuthenticated, isAdmin } from '../middlewares/auth.middleware';
import {
  getLeadMessages,
  updateMessageStatus,
  deleteMessage,
  getRecentMessagesPerLead,
  getWhatsappStatus,
  getWhatsappConfig,
  saveWhatsappConfig,
  getQRCode,
  checkApiMessageStatus,
  sendTextMessage,
  sendImageMessage,
  sendTemplateMessage,
  handleWebhook, // POST webhook
  verifyWebhook,    // GET webhook verification
  // Novos controladores
  sendDocumentMessage,
  sendAudioMessage,
  sendVideoMessage,
  getWhatsappGroups,
  createWhatsappGroup,
  getWhatsappContacts
} from '../controllers/whatsapp.controller';

const router = Router();

// Webhook routes (NO AUTH)
router.post('/webhook', handleWebhook);
router.get('/webhook', verifyWebhook); // For Meta webhook verification

// Configuration routes (Admin only)
router.get('/config', isAuthenticated, isAdmin, getWhatsappConfig);
router.post('/config', isAuthenticated, isAdmin, saveWhatsappConfig);

// General WhatsApp status and QR code (Authenticated users)
router.get('/status', isAuthenticated, getWhatsappStatus);
router.get('/qrcode', isAuthenticated, getQRCode);

// Message sending and management (Authenticated users)
router.post('/send', isAuthenticated, sendTextMessage);
router.post('/send-image', isAuthenticated, sendImageMessage);
router.post('/template', isAuthenticated, sendTemplateMessage);

// Novas rotas para envio de diferentes tipos de mídia
router.post('/send-document', isAuthenticated, sendDocumentMessage);
router.post('/send-audio', isAuthenticated, sendAudioMessage);
router.post('/send-video', isAuthenticated, sendVideoMessage);

// Rotas para gerenciamento de grupos
router.get('/groups', isAuthenticated, getWhatsappGroups);
router.post('/groups', isAuthenticated, createWhatsappGroup);

// Rota para obter contatos
router.get('/contacts', isAuthenticated, getWhatsappContacts);

router.get('/recent-messages', isAuthenticated, getRecentMessagesPerLead);
router.get('/lead/:leadId', isAuthenticated, getLeadMessages);
// Note: a previous route was /api/whatsapp/lead/:id - this consolidates to /lead/:leadId

router.patch('/messages/:id/status', isAuthenticated, updateMessageStatus);
router.delete('/messages/:id', isAuthenticated, deleteMessage);
router.get('/message-status/:messageId', isAuthenticated, checkApiMessageStatus);


export default router; 