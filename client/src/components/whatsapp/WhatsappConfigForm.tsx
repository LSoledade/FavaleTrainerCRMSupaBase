import { useState, useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { Eye, EyeOff, RefreshCw, RotateCw, Check, X } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';

export default function WhatsappConfigForm() {
  const [apiUrl, setApiUrl] = useState('');
  const [apiToken, setApiToken] = useState('');
  const [apiInstance, setApiInstance] = useState('');
  const [activeTab, setActiveTab] = useState('general');
  const [showToken, setShowToken] = useState(false);
  const [qrCodeVisible, setQrCodeVisible] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Consulta para obter a configuração atual
  const { data: configData, isLoading: isLoadingConfig } = useQuery({
    queryKey: ['/api/whatsapp/config'],
    onSuccess: (data) => {
      setApiUrl(data.apiUrl || '');
      setApiInstance(data.apiInstance || 'default');
      // Não definimos o token aqui pois o servidor não retorna o token completo por segurança
    },
    onError: (error: any) => {
      toast({
        title: 'Erro ao carregar configurações',
        description: 'Não foi possível carregar as configurações do WhatsApp.',
        variant: 'destructive',
      });
    },
  });

  // Consulta para verificar o status da conexão
  const { data: statusData, isLoading: isLoadingStatus, refetch: refetchStatus } = useQuery({
    queryKey: ['/api/whatsapp/status'],
    refetchInterval: 30000, // Refetch every 30 seconds
  });

  // Mutação para salvar as configurações
  const saveConfigMutation = useMutation({
    mutationFn: async () => {
      return apiRequest('POST', '/api/whatsapp/config', {
        apiUrl: apiUrl.trim(),
        apiToken: apiToken.trim() || undefined,
        apiInstance: apiInstance.trim() || 'default',
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/whatsapp/config'] });
      queryClient.invalidateQueries({ queryKey: ['/api/whatsapp/status'] });
      toast({
        title: 'Configurações salvas',
        description: 'As configurações do WhatsApp foram salvas com sucesso.',
      });
      // Limpar o campo de token por segurança
      setApiToken('');
      setShowToken(false);
    },
    onError: (error: any) => {
      toast({
        title: 'Erro ao salvar configurações',
        description: error?.response?.data?.message || 'Não foi possível salvar as configurações do WhatsApp.',
        variant: 'destructive',
      });
    },
  });

  // Mutação para obter o QR Code
  const qrCodeMutation = useMutation({
    mutationFn: async () => {
      return apiRequest('GET', '/api/whatsapp/qrcode');
    },
    onSuccess: (data) => {
      setQrCodeVisible(true);
      // Também atualizamos o status para ver se o QR code funcionou
      setTimeout(() => {
        refetchStatus();
      }, 5000);
    },
    onError: (error: any) => {
      toast({
        title: 'Erro ao gerar QR Code',
        description: error?.response?.data?.message || 'Não foi possível gerar o QR Code para conexão.',
        variant: 'destructive',
      });
    },
  });

  // Salvar configurações
  const handleSaveConfig = () => {
    if (!apiUrl) {
      toast({
        title: 'URL da API obrigatória',
        description: 'Por favor, informe a URL da Evolution API.',
        variant: 'destructive',
      });
      return;
    }
    saveConfigMutation.mutate();
  };

  // Gerar QR Code
  const handleGenerateQRCode = () => {
    qrCodeMutation.mutate();
  };

  return (
    <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
      <TabsList className="grid w-full grid-cols-2">
        <TabsTrigger value="general">Geral</TabsTrigger>
        <TabsTrigger value="connection">Conexão</TabsTrigger>
      </TabsList>
      
      <TabsContent value="general" className="mt-4">
        <Card>
          <CardHeader>
            <CardTitle>Configurações da Evolution API</CardTitle>
            <CardDescription>
              Configure a integração com a Evolution API para enviar e receber mensagens via WhatsApp.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="api-url">URL da API</Label>
              <Input
                id="api-url"
                value={apiUrl}
                onChange={(e) => setApiUrl(e.target.value)}
                placeholder="https://evolution-api.exemplo.com/api/v1"
                disabled={isLoadingConfig}
              />
              <p className="text-xs text-muted-foreground">
                URL completa da Evolution API, incluindo o prefixo e versão (ex: https://evolution-api.exemplo.com/api/v1)
              </p>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="api-token">Token da API</Label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Input
                    id="api-token"
                    type={showToken ? "text" : "password"}
                    value={apiToken}
                    onChange={(e) => setApiToken(e.target.value)}
                    placeholder={configData?.hasToken ? "••••••••••••••••" : "Token de autenticação"}
                    disabled={isLoadingConfig}
                  />
                  <button 
                    type="button"
                    className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
                    onClick={() => setShowToken(!showToken)}
                  >
                    {showToken ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                {configData?.hasToken
                  ? "Token já configurado. Preencha apenas se desejar alterar."
                  : "Token de autenticação para a Evolution API (obrigatório)"}
              </p>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="api-instance">Nome da Instância</Label>
              <Input
                id="api-instance"
                value={apiInstance}
                onChange={(e) => setApiInstance(e.target.value)}
                placeholder="default"
                disabled={isLoadingConfig}
              />
              <p className="text-xs text-muted-foreground">
                Nome da instância na Evolution API. Use "default" se não tiver certeza.
              </p>
            </div>
          </CardContent>
          <CardFooter className="flex justify-between">
            <div className="flex items-center text-sm text-muted-foreground">
              {configData?.lastUpdated && (
                <span>Última atualização: {new Date(configData.lastUpdated).toLocaleString()}</span>
              )}
            </div>
            <Button 
              onClick={handleSaveConfig} 
              disabled={saveConfigMutation.isPending || isLoadingConfig}
            >
              {saveConfigMutation.isPending ? (
                <>
                  <RotateCw className="mr-2 h-4 w-4 animate-spin" />
                  Salvando...
                </>
              ) : (
                'Salvar Configurações'
              )}
            </Button>
          </CardFooter>
        </Card>
      </TabsContent>
      
      <TabsContent value="connection" className="mt-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Status da Conexão</span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => refetchStatus()}
                disabled={isLoadingStatus}
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${isLoadingStatus ? 'animate-spin' : ''}`} />
                Atualizar
              </Button>
            </CardTitle>
            <CardDescription>
              Verifique o status da conexão com o WhatsApp e configure o dispositivo.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {isLoadingStatus ? (
              <div className="space-y-2">
                <Skeleton className="h-4 w-[250px]" />
                <Skeleton className="h-4 w-[200px]" />
                <Skeleton className="h-12 w-full" />
              </div>
            ) : statusData ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">Status:</p>
                    <div className="flex items-center gap-2 mt-1">
                      {statusData.status === 'connected' ? (
                        <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                          <Check className="h-3 w-3 mr-1" /> Conectado
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
                          <X className="h-3 w-3 mr-1" /> Desconectado
                        </Badge>
                      )}
                    </div>
                  </div>
                  
                  <div>
                    <p className="text-sm font-medium">Telefone:</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      {statusData.phone || 'Não disponível'}
                    </p>
                  </div>
                </div>
                
                <Separator />
                
                {statusData.status !== 'connected' && (
                  <div className="space-y-4">
                    <p className="text-sm">
                      Para conectar o WhatsApp, escaneie o QR Code abaixo com seu celular:
                    </p>
                    
                    <div className="flex flex-col items-center justify-center border rounded-lg p-4">
                      {qrCodeMutation.isPending ? (
                        <div className="w-64 h-64 flex items-center justify-center">
                          <RotateCw className="h-10 w-10 animate-spin text-primary" />
                        </div>
                      ) : qrCodeMutation.data?.details?.qrcode ? (
                        <div className="space-y-2">
                          <div className="overflow-hidden rounded-lg border border-gray-200">
                            <img
                              src={qrCodeMutation.data.details.qrcode}
                              alt="QR Code para conexão do WhatsApp"
                              className="w-64 h-64 object-contain"
                            />
                          </div>
                          <p className="text-xs text-center text-muted-foreground">
                            Este QR Code expira após alguns minutos. Se expirar, gere um novo.
                          </p>
                        </div>
                      ) : (
                        <div className="text-center space-y-4">
                          <p className="text-sm text-muted-foreground">
                            Clique no botão abaixo para gerar um QR Code para conexão
                          </p>
                          <Button 
                            onClick={handleGenerateQRCode}
                            disabled={!configData || qrCodeMutation.isPending}
                          >
                            Gerar QR Code
                          </Button>
                        </div>
                      )}
                    </div>
                    
                    <Alert className="bg-amber-50 border-amber-200">
                      <AlertTitle className="text-amber-800">Como conectar</AlertTitle>
                      <AlertDescription className="text-amber-700">
                        <ol className="list-decimal list-inside space-y-1 text-sm">
                          <li>Abra o WhatsApp no seu telefone</li>
                          <li>Toque em Menu ou Configurações</li>
                          <li>Selecione "Aparelhos conectados"</li>
                          <li>Toque em "Conectar um aparelho"</li>
                          <li>Escaneie o QR Code gerado</li>
                        </ol>
                      </AlertDescription>
                    </Alert>
                  </div>
                )}
                
                {statusData.status === 'connected' && (
                  <Alert className="bg-green-50 border-green-200">
                    <AlertTitle className="text-green-800">WhatsApp Conectado</AlertTitle>
                    <AlertDescription className="text-green-700">
                      <p className="text-sm">
                        Sua conta de WhatsApp está conectada e pronta para enviar e receber mensagens.
                      </p>
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            ) : (
              <Alert variant="destructive">
                <AlertTitle>Erro de Conexão</AlertTitle>
                <AlertDescription>
                  Não foi possível obter o status da conexão. Verifique as configurações da API.
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  );
}