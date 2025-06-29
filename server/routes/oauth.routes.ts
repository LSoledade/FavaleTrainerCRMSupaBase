
import { Router } from 'express';
import { isAuthenticated } from '../middlewares/auth.middleware';
import {
  getGoogleAuthUrl,
  handleGoogleCallback,
  getTokenStatus,
  revokeGoogleAccess
} from '../controllers/oauth.controller';

const router = Router();

// Todas as rotas OAuth2 precisam de autenticação
router.use(isAuthenticated);

// Gerar URL de autorização do Google
router.get('/google/auth-url', getGoogleAuthUrl);

// Callback do Google OAuth2
router.get('/google/callback', handleGoogleCallback);

// Status dos tokens
router.get('/google/status', getTokenStatus);

// Revogar acesso
router.delete('/google/revoke', revokeGoogleAccess);

export default router;
