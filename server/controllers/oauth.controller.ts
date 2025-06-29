
import { Request, Response } from 'express';
import { storage } from '../storage';
import { getAuthUrl, getTokensFromCode, setCredentials } from '../google-calendar';
import { logAuditEvent, AuditEventType } from '../audit-log';

export async function getGoogleAuthUrl(req: Request, res: Response) {
  try {
    const authUrl = getAuthUrl();
    
    logAuditEvent(AuditEventType.OAUTH_INIT, req, {
      userId: req.user?.id,
      provider: 'google'
    });
    
    res.json({ authUrl });
  } catch (error) {
    console.error('Erro ao gerar URL de autorização:', error);
    res.status(500).json({ 
      message: 'Erro ao gerar URL de autorização',
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
}

export async function handleGoogleCallback(req: Request, res: Response) {
  try {
    const { code, error } = req.query;
    
    if (error) {
      logAuditEvent(AuditEventType.OAUTH_ERROR, req, {
        userId: req.user?.id,
        provider: 'google',
        error: String(error)
      });
      
      return res.status(400).json({ 
        message: 'Autorização negada pelo usuário',
        error: String(error)
      });
    }
    
    if (!code || typeof code !== 'string') {
      return res.status(400).json({ 
        message: 'Código de autorização não fornecido' 
      });
    }
    
    // Trocar código por tokens
    const tokens = await getTokensFromCode(code);
    
    // Salvar tokens no banco de dados
    await storage.saveGoogleTokens(req.user!.id, tokens);
    
    // Configurar credenciais para uso imediato
    setCredentials(tokens);
    
    logAuditEvent(AuditEventType.OAUTH_SUCCESS, req, {
      userId: req.user?.id,
      provider: 'google',
      hasRefreshToken: !!tokens.refresh_token
    });
    
    res.json({ 
      message: 'Autorização concedida com sucesso',
      hasRefreshToken: !!tokens.refresh_token
    });
  } catch (error) {
    console.error('Erro no callback OAuth2:', error);
    
    logAuditEvent(AuditEventType.OAUTH_ERROR, req, {
      userId: req.user?.id,
      provider: 'google',
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    });
    
    res.status(500).json({ 
      message: 'Erro ao processar autorização',
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
}

export async function getTokenStatus(req: Request, res: Response) {
  try {
    const tokens = await storage.getGoogleTokens(req.user!.id);
    
    if (!tokens) {
      return res.json({ 
        authorized: false,
        message: 'Nenhuma autorização encontrada'
      });
    }
    
    const now = Date.now();
    const isExpired = tokens.expiry_date <= now;
    
    res.json({
      authorized: true,
      isExpired,
      hasRefreshToken: !!tokens.refresh_token,
      expiryDate: new Date(tokens.expiry_date).toISOString()
    });
  } catch (error) {
    console.error('Erro ao verificar status dos tokens:', error);
    res.status(500).json({ 
      message: 'Erro ao verificar status da autorização',
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
}

export async function revokeGoogleAccess(req: Request, res: Response) {
  try {
    await storage.deleteGoogleTokens(req.user!.id);
    
    logAuditEvent(AuditEventType.OAUTH_REVOKE, req, {
      userId: req.user?.id,
      provider: 'google'
    });
    
    res.json({ message: 'Acesso revogado com sucesso' });
  } catch (error) {
    console.error('Erro ao revogar acesso:', error);
    res.status(500).json({ 
      message: 'Erro ao revogar acesso',
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
}
