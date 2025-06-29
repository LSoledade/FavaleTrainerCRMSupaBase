
import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { toast } from '@/hooks/use-toast';
import { Loader2, Calendar, Check, X, RefreshCw } from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';

interface TokenStatus {
  authorized: boolean;
  isExpired?: boolean;
  hasRefreshToken?: boolean;
  expiryDate?: string;
  message?: string;
}

export default function GoogleCalendarConfig() {
  const [tokenStatus, setTokenStatus] = useState<TokenStatus | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isAuthenticating, setIsAuthenticating] = useState(false);

  const fetchTokenStatus = async () => {
    try {
      setIsLoading(true);
      const response = await apiRequest('GET', '/api/oauth/google/status');
      setTokenStatus(response);
    } catch (error) {
      console.error('Erro ao verificar status:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível verificar o status da autorização',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleAuth = async () => {
    try {
      setIsAuthenticating(true);
      const response = await apiRequest('GET', '/api/oauth/google/auth-url');
      
      // Abrir janela de autorização
      const authWindow = window.open(
        response.authUrl,
        'google-auth',
        'width=500,height=600,scrollbars=yes,resizable=yes'
      );

      // Monitorar o fechamento da janela
      const checkClosed = setInterval(() => {
        if (authWindow?.closed) {
          clearInterval(checkClosed);
          setIsAuthenticating(false);
          // Recarregar status após autorização
          setTimeout(fetchTokenStatus, 1000);
        }
      }, 1000);

      // Timeout após 5 minutos
      setTimeout(() => {
        if (!authWindow?.closed) {
          authWindow?.close();
          clearInterval(checkClosed);
          setIsAuthenticating(false);
        }
      }, 300000);

    } catch (error) {
      setIsAuthenticating(false);
      toast({
        title: 'Erro',
        description: 'Não foi possível iniciar a autorização',
        variant: 'destructive',
      });
    }
  };

  const handleRevokeAccess = async () => {
    if (!confirm('Tem certeza que deseja revogar o acesso ao Google Calendar?')) {
      return;
    }

    try {
      setIsLoading(true);
      await apiRequest('DELETE', '/api/oauth/google/revoke');
      
      toast({
        title: 'Acesso revogado',
        description: 'O acesso ao Google Calendar foi revogado com sucesso',
      });
      
      await fetchTokenStatus();
    } catch (error) {
      toast({
        title: 'Erro',
        description: 'Não foi possível revogar o acesso',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTokenStatus();
  }, []);

  const getStatusBadge = () => {
    if (!tokenStatus) return null;

    if (!tokenStatus.authorized) {
      return <Badge variant="destructive">Não autorizado</Badge>;
    }

    if (tokenStatus.isExpired) {
      return <Badge variant="outline">Token expirado</Badge>;
    }

    return <Badge variant="default" className="bg-green-500">Autorizado</Badge>;
  };

  return (
    <Card className="border-gray-100 dark:border-gray-700 shadow-sm rounded-xl">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg font-medium text-gray-800 dark:text-white flex items-center gap-2">
          <Calendar className="h-5 w-5" />
          Integração Google Calendar
        </CardTitle>
        <CardDescription className="text-gray-500 dark:text-gray-400">
          Configure a integração com o Google Calendar para sincronizar agendamentos
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Status da Autorização:</span>
              {getStatusBadge()}
            </div>

            {tokenStatus?.authorized && (
              <>
                <Separator />
                <div className="space-y-2 text-sm">
                  <div className="flex items-center justify-between">
                    <span>Token de Atualização:</span>
                    {tokenStatus.hasRefreshToken ? (
                      <Check className="h-4 w-4 text-green-500" />
                    ) : (
                      <X className="h-4 w-4 text-red-500" />
                    )}
                  </div>
                  
                  {tokenStatus.expiryDate && (
                    <div className="flex items-center justify-between">
                      <span>Expira em:</span>
                      <span className="text-muted-foreground">
                        {new Date(tokenStatus.expiryDate).toLocaleString('pt-BR')}
                      </span>
                    </div>
                  )}
                </div>
              </>
            )}

            <Separator />

            <div className="flex gap-2">
              {!tokenStatus?.authorized || tokenStatus.isExpired ? (
                <Button 
                  onClick={handleGoogleAuth} 
                  disabled={isAuthenticating}
                  className="flex-1"
                >
                  {isAuthenticating ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Autorizando...
                    </>
                  ) : (
                    <>
                      <Calendar className="mr-2 h-4 w-4" />
                      Autorizar Google Calendar
                    </>
                  )}
                </Button>
              ) : (
                <>
                  <Button 
                    onClick={fetchTokenStatus} 
                    variant="outline"
                    disabled={isLoading}
                  >
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Atualizar
                  </Button>
                  
                  <Button 
                    onClick={handleRevokeAccess} 
                    variant="destructive"
                    disabled={isLoading}
                  >
                    Revogar Acesso
                  </Button>
                </>
              )}
            </div>

            {!tokenStatus?.authorized && (
              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-md p-3">
                <p className="text-sm text-blue-700 dark:text-blue-300">
                  Para sincronizar agendamentos com o Google Calendar, você precisa autorizar o acesso. 
                  Clique no botão acima para iniciar o processo de autorização.
                </p>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
