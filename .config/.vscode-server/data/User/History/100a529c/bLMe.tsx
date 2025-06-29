import { useState, useEffect, useRef, FormEvent } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Lead, WhatsappMessage } from '@shared/schema';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { 
  Paperclip, Send, Image, Mic, AlertCircle, MoreVertical, ChevronLeft, 
  Video, FileText, X, Check, RotateCw 
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuPortal,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import WhatsappTemplateSelector from './WhatsappTemplateSelector';

interface WhatsappChatProps {
  lead: Lead;
  onClose?: () => void;
}

const WhatsappChat = ({ lead, onClose }: WhatsappChatProps) => {
  const [message, setMessage] = useState('');
  const [attaching, setAttaching] = useState(false);
  const [showMediaDialog, setShowMediaDialog] = useState(false);
  const [mediaType, setMediaType] = useState<'image' | 'document' | 'audio' | 'video'>('image');
  const [mediaUrl, setMediaUrl] = useState('');
  const [mediaCaption, setMediaCaption] = useState('');
  const [documentName, setDocumentName] = useState('');
  // Missing state variables for image dialog
  const [showImageDialog, setShowImageDialog] = useState(false);
  const [imageUrl, setImageUrl] = useState('');
  const [imageCaption, setImageCaption] = useState('');
  const endOfMessagesRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Buscar mensagens do lead
  const { data: messages = [], isLoading, error } = useQuery<WhatsappMessage[]>({
    queryKey: [`/api/whatsapp/lead/${lead.id}`],
    refetchInterval: 10000, // Atualizar a cada 10 segundos
  });

  // Mutação para enviar mensagem de texto
  const sendMessageMutation = useMutation({
    mutationFn: async (content: string) => {
      return apiRequest('POST', '/api/whatsapp/send', {
        leadId: lead.id,
        direction: 'outgoing',
        content,
        status: 'sent',
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/whatsapp/lead/${lead.id}`] });
      setMessage('');
    },
    onError: (error: any) => {
      console.error('Erro ao enviar mensagem:', error);
      
      let errorMessage = 'Não foi possível enviar a mensagem';
      
      // Verificar se é um erro específico de número não autorizado
      if (error?.response?.data?.isUnauthorizedNumber) {
        errorMessage = `Número ${lead.phone} não autorizado. Apenas números verificados podem receber mensagens no ambiente de teste.`;
      } else if (error?.response?.data?.error) {
        // Usar mensagem de erro da API quando disponível
        errorMessage = error.response.data.error;
      }
      
      toast({
        title: 'Erro no envio',
        description: errorMessage,
        variant: 'destructive',
      });
    },
  });
  
  // Mutação para enviar imagem
  const sendImageMutation = useMutation({
    mutationFn: async ({ url, caption }: { url: string; caption: string }) => {
      return apiRequest('POST', '/api/whatsapp/send-image', {
        leadId: lead.id,
        imageUrl: url,
        caption
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/whatsapp/lead/${lead.id}`] });
      resetMediaDialog();
      toast({
        title: 'Imagem enviada',
        description: 'Imagem enviada com sucesso'
      });
    },
    onError: handleSendMediaError
  });

  // Rolar para o final das mensagens quando novas mensagens chegarem
  useEffect(() => {
    if (endOfMessagesRef.current) {
      endOfMessagesRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);
  
  // Verificar status das mensagens recentes periodicamente
  useEffect(() => {
    if (!messages.length) return;
    
    // Função para verificar status das mensagens enviadas recentemente
    const checkRecentMessageStatus = async () => {
      // Selecionar mensagens enviadas nas últimas 24 horas que têm messageId e não estão com status final
      const recentMessages = messages.filter(msg => {
        // Verifica se tem messageId, é de saída e não está em status final
        if (!msg.messageId || msg.direction !== 'outgoing') return false;
        if (msg.status === 'read' || msg.status === 'failed') return false;
        
        // Verifica se é recente (últimas 24 horas)
        const messageTime = new Date(msg.timestamp).getTime();
        const oneDayAgo = Date.now() - (24 * 60 * 60 * 1000);
        return messageTime > oneDayAgo;
      });
      
      // Verificar status de cada mensagem
      for (const message of recentMessages) {
        try {
          const response = await fetch(`/api/whatsapp/message-status/${message.messageId}`);
          if (response.ok) {
            const data = await response.json();
            if (data.success && data.status !== message.status) {
              // Se o status mudou, atualizar as mensagens
              queryClient.invalidateQueries({ queryKey: [`/api/whatsapp/lead/${lead.id}`] });
              break; // Uma atualização é suficiente para recarregar todas as mensagens
            }
          }
        } catch (error) {
          console.warn('Erro ao verificar status da mensagem:', error);
        }
      }
    };
    
    // Verificar inicialmente após 10 segundos
    const initialTimeout = setTimeout(checkRecentMessageStatus, 10000);
    
    // Depois verificar a cada 30 segundos
    const interval = setInterval(checkRecentMessageStatus, 30000);
    
    return () => {
      clearTimeout(initialTimeout);
      clearInterval(interval);
    };
  }, [messages, lead.id, queryClient]);

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (message.trim()) {
      sendMessageMutation.mutate(message.trim());
    }
  };
  
  const handleSendImage = () => {
    if (!imageUrl) {
      toast({
        title: 'URL da imagem obrigatória',
        description: 'Por favor, insira uma URL válida para a imagem',
        variant: 'destructive'
      });
      return;
    }
    
    sendImageMutation.mutate({ 
      url: imageUrl, 
      caption: imageCaption 
    });
  };

  const formatTime = (timestamp: string | Date) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-8 w-8 border-4 border-t-primary border-gray-200"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-full text-red-500">
        <AlertCircle className="mr-2" />
        <span>Erro ao carregar mensagens</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-background rounded-lg overflow-hidden border">
      {/* Cabeçalho do chat */}
      <div className="p-4 border-b flex items-center justify-between">
        <div className="flex items-center">
          {onClose && (
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-8 w-8 mr-2 md:hidden"
              onClick={onClose}
            >
              <ChevronLeft size={16} />
            </Button>
          )}
          <Avatar className="h-10 w-10 mr-3">
            <AvatarFallback className="bg-primary-light text-white font-semibold">
              {lead.name.substring(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div>
            <h3 className="font-medium text-sm">{lead.name}</h3>
            <p className="text-xs text-muted-foreground">{lead.phone || 'Sem telefone'}</p>
          </div>
        </div>
        <div className="flex items-center space-x-1">
          {/* Seletor de templates */}
          <WhatsappTemplateSelector lead={lead} onSuccess={() => {
            if (endOfMessagesRef.current) {
              setTimeout(() => endOfMessagesRef.current?.scrollIntoView({ behavior: 'smooth' }), 1000);
            }
          }} />
          
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <MoreVertical size={16} className="text-muted-foreground" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Mais opções</p>
              </TooltipContent>
            </Tooltip>
            {onClose && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-8 w-8 hidden md:flex"
                    onClick={onClose}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="18" y1="6" x2="6" y2="18"></line>
                      <line x1="6" y1="6" x2="18" y2="18"></line>
                    </svg>
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Fechar</p>
                </TooltipContent>
              </Tooltip>
            )}
          </TooltipProvider>
        </div>
      </div>

      {/* Área de mensagens */}
      <div 
        className="flex-1 overflow-y-auto p-4 space-y-3" 
        style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg width=\'20\' height=\'20\' viewBox=\'0 0 40 40\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cg fill=\'%239C92AC\' fill-opacity=\'0.05\' fill-rule=\'evenodd\'%3E%3Cpath d=\'M0 20L20 0h20L0 40z\'/%3E%3Cpath d=\'M20 40L40 20 40 40z\'/%3E%3C/g%3E%3C/svg%3E")' }}
      >
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="bg-muted rounded-full p-4 mb-3">
              <AlertCircle className="h-6 w-6 text-muted-foreground" />
            </div>
            <h3 className="font-medium mb-1">Nenhuma mensagem ainda</h3>
            <p className="text-sm text-muted-foreground mb-2">
              Envie uma mensagem para iniciar a conversa com {lead.name}.
            </p>
          </div>
        ) : (
          messages.map((msg) => (
            <div 
              key={msg.id} 
              className={`flex ${msg.direction === 'outgoing' ? 'justify-end' : 'justify-start'}`}
            >
              <div 
                className={`max-w-xs md:max-w-md rounded-lg p-3 ${msg.direction === 'outgoing' ? 'bg-primary text-primary-foreground rounded-br-none' : 'bg-gray-100 dark:bg-muted text-gray-900 dark:text-muted-foreground rounded-bl-none'}`}
              >
                {msg.mediaUrl && msg.mediaType === 'image' ? (
                  <div className="space-y-2">
                    <img 
                      src={msg.mediaUrl} 
                      alt="Imagem" 
                      className="max-w-full rounded-md"
                      onError={(e) => {
                        e.currentTarget.src = 'https://via.placeholder.com/300x200?text=Erro+ao+carregar+imagem';
                      }} 
                    />
                    {msg.content && msg.content !== '[Imagem enviada]' && (
                      <p className="whitespace-pre-wrap break-words text-sm">{msg.content}</p>
                    )}
                  </div>
                ) : (
                  <p className="whitespace-pre-wrap break-words text-sm">{msg.content}</p>
                )}
                <div className="text-xs opacity-80 text-right mt-1 flex justify-end items-center">
                  {formatTime(msg.timestamp)}
                  {msg.direction === 'outgoing' && (
                    <span className="ml-1">
                      {msg.status === 'read' ? (
                        <span className="text-blue-400">✓✓</span>
                      ) : msg.status === 'delivered' ? (
                        <span>✓✓</span>
                      ) : (
                        <span>✓</span>
                      )}
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
        <div ref={endOfMessagesRef} />
      </div>

      {/* Input para nova mensagem */}
      <form onSubmit={handleSendMessage} className="p-3 border-t flex items-end">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button 
                type="button"
                variant="ghost"
                size="icon"
                className="h-9 w-9 mr-1"
                onClick={() => setAttaching(!attaching)}
              >
                <Paperclip size={18} className="text-muted-foreground" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="top">
              <p>Anexar arquivo</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
        
        {attaching && (
          <div className="flex space-x-1">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button 
                    type="button" 
                    variant="ghost" 
                    size="icon" 
                    className="h-9 w-9"
                    onClick={() => setShowImageDialog(true)}
                  >
                    <Image size={18} className="text-muted-foreground" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="top">
                  <p>Enviar imagem</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button type="button" variant="ghost" size="icon" className="h-9 w-9">
                    <Mic size={18} className="text-muted-foreground" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="top">
                  <p>Enviar áudio</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        )}
        
        <div className="flex-1 mr-2">
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Digite uma mensagem"
            className="w-full p-2 border rounded-lg focus:outline-none focus:ring-1 focus:ring-primary resize-none min-h-[40px] max-h-32 text-sm"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                if (message.trim()) {
                  handleSendMessage(e);
                }
              }
            }}
          />
        </div>
        
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button 
                type="submit" 
                className="h-9 w-9 p-0 rounded-full"
                disabled={!message.trim() || sendMessageMutation.isPending}
              >
                <Send size={16} />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="top">
              <p>Enviar mensagem</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </form>
      
      {/* Dialog para upload de imagem */}
      <Dialog open={showImageDialog} onOpenChange={setShowImageDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Enviar Imagem</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="imageUrl">URL da Imagem</Label>
              <Input
                id="imageUrl"
                placeholder="https://exemplo.com/imagem.jpg"
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Insira a URL de uma imagem pública disponível na internet
              </p>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="caption">Legenda (opcional)</Label>
              <Input
                id="caption"
                placeholder="Escreva uma legenda para a imagem..."
                value={imageCaption}
                onChange={(e) => setImageCaption(e.target.value)}
              />
            </div>
            
            {imageUrl && (
              <div className="border rounded-md p-2 mt-2">
                <img 
                  src={imageUrl} 
                  alt="Pré-visualização" 
                  className="max-w-full h-auto rounded" 
                  onError={(e) => {
                    e.currentTarget.src = 'https://via.placeholder.com/300x200?text=Erro+ao+carregar+imagem';
                    toast({
                      title: 'Erro ao carregar imagem',
                      description: 'Verifique se a URL é válida e acessível',
                      variant: 'destructive'
                    });
                  }}
                />
              </div>
            )}
          </div>
          <div className="flex justify-end space-x-2">
            <Button variant="outline" onClick={() => setShowImageDialog(false)}>
              Cancelar
            </Button>
            <Button 
              onClick={handleSendImage} 
              disabled={!imageUrl || sendImageMutation.isPending}
            >
              Enviar Imagem
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default WhatsappChat;