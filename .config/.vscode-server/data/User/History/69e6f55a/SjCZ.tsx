import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { Lead, WhatsappMessage } from "@shared/schema";
import { useWhatsappContext } from "@/context/WhatsappContext";
import { CheckCircle2, AlertCircle, XCircle, Search, Filter, PlusCircle, MoreVertical, Star, Clock, Inbox, RefreshCw, Paperclip, Send } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { format, isToday, isYesterday, isSameWeek } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function WhatsappPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTab, setSelectedTab] = useState("all");
  const { openWhatsappChat, connectionStatus, refreshConnectionStatus } = useWhatsappContext();

  // Estado para o lead selecionado na lista
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [activeTab, setActiveTab] = useState('all');
  const endOfMessagesRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  
  // Buscar todos os leads
  const { data: leads = [], isLoading } = useQuery<Lead[]>({
    queryKey: ["/api/leads"],
  });
  
  // Mensagem mais recente para exibir na prévia
  const { data: allMessages = {} } = useQuery<{[leadId: string]: any[]}>({ 
    queryKey: ['/api/whatsapp/recent-messages'],
    refetchInterval: 30000, // Atualiza a cada 30 segundos
  });
  
  /*
   * Filtrar leads com base em 3 critérios:
   * 1. Somente mostrar Leonardo Soledade (ID 14776) inicialmente
   * 2. Adicionar outros leads à lista quando eles tiverem mensagens
   * 3. Aplicar os filtros de busca e tab selecionada
   * 
   * Isso reduz o lag inicial ao carregar a página, mostrando apenas
   * as conversas realmente relevantes.
   */
  const filteredLeads = leads.filter((lead: Lead) => {
    // Verifica se é o Leonardo Soledade (ID 14776) ou se tem mensagens enviadas/recebidas
    const isLeonardo = lead.id === 14776;
    const hasMessages = Object.keys(allMessages || {})
      .map(id => parseInt(id))
      .includes(lead.id);
    
    // Se não for o Leonardo e não tiver mensagens, não mostra na lista
    if (!isLeonardo && !hasMessages) return false;
    
    // Aplica o filtro de busca
    const matchesSearch = searchQuery === "" ||
      lead.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (lead.phone && lead.phone.includes(searchQuery)) ||
      (lead.email && lead.email.toLowerCase().includes(searchQuery.toLowerCase()));

    if (selectedTab === "all") return matchesSearch;
    return matchesSearch && lead.status.toLowerCase() === selectedTab.toLowerCase();
  });
  
  // Formatar a data para exibição
  const formatMessageDate = (date: Date | string) => {
    const messageDate = new Date(date);
    
    if (isToday(messageDate)) {
      return format(messageDate, "HH:mm", { locale: ptBR });
    } else if (isYesterday(messageDate)) {
      return "Ontem";
    } else if (isSameWeek(messageDate, new Date())) {
      return format(messageDate, "EEEE", { locale: ptBR });
    } else {
      return format(messageDate, "dd/MM/yyyy", { locale: ptBR });
    }
  };
  
  // Buscar mensagens do lead selecionado
  const { data: messages = [] } = useQuery<WhatsappMessage[]>({
    queryKey: selectedLead ? [`/api/whatsapp/lead/${selectedLead.id}`] : ['no-messages'],
    enabled: !!selectedLead,
    refetchInterval: selectedLead ? 10000 : false, // Atualizar a cada 10 segundos se tiver um lead selecionado
  });
  
  const getLastMessage = (leadId: number) => {
    const leadMessages = allMessages[leadId] || [];
    if (leadMessages.length === 0) {
      return 'Nenhuma mensagem ainda...';
    }
    
    const lastMessage = leadMessages[0]; // A primeira mensagem do array será a mais recente
    const prefix = lastMessage.direction === 'outgoing' ? 'Você: ' : '';
    return `${prefix}${lastMessage.content}`;
  };
  
  const getLastMessageTime = (leadId: number) => {
    const leadMessages = allMessages[leadId] || [];
    if (leadMessages.length === 0) {
      return null;
    }
    
    return new Date(leadMessages[0].timestamp);
  };
  
  // Estado para a mensagem a ser enviada
  const [messageText, setMessageText] = useState("");
  
  // Efeito para rolar para o final das mensagens quando novas mensagens chegarem
  useEffect(() => {
    if (endOfMessagesRef.current) {
      endOfMessagesRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);
  
  // Mutação para enviar mensagem
  const { mutate: sendMessage, isPending: isSending } = useMutation({
    mutationFn: async (content: string) => {
      if (!selectedLead) return null;
      
      return fetch('/api/whatsapp/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          leadId: selectedLead.id,
          direction: 'outgoing',
          content,
          status: 'pending',
        }),
      }).then(async res => {
        const responseData = await res.json();
        
        if (!res.ok) {
          // Verificar se o erro é de número não autorizado
          if (responseData.unauthorizedNumber) {
            throw new Error(
              'Número não autorizado: Este número não está na lista de permissões da API do WhatsApp. ' +
              'Em modo de desenvolvimento, você só pode enviar mensagens para números previamente autorizados.'
            );
          }
          throw new Error(responseData.error || 'Falha ao enviar mensagem');
        }
        
        return responseData;
      });
    },
    onSuccess: () => {
      // Limpar o campo de mensagem
      setMessageText('');
      
      // Atualizar a lista de mensagens
      if (selectedLead) {
        // Invalidar tanto a consulta de mensagens específicas quanto a de mensagens recentes
        queryClient.invalidateQueries({ queryKey: [`/api/whatsapp/lead/${selectedLead.id}`] });
        queryClient.invalidateQueries({ queryKey: ['/api/whatsapp/recent-messages'] });
      }
    },
    onError: (error) => {
      console.error('Erro ao enviar mensagem:', error);
      
      // Exibir notificação de erro usando o toast
      toast({
        title: "Erro ao enviar mensagem",
        description: error instanceof Error ? error.message : 'Falha ao enviar mensagem',
        variant: "destructive",
      });
    },
  });
  
  // Função para lidar com o envio de mensagem
  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (messageText.trim() && !isSending) {
      sendMessage(messageText.trim());
    }
  };
  
  return (
    <div className="flex flex-col h-[calc(100vh-8rem)] w-full bg-background rounded-lg border">
      {/* Status da conexão */}
      <Alert 
        variant={connectionStatus.status === 'connected' ? 'default' : 
                connectionStatus.status === 'checking' ? 'default' : 'destructive'} 
        className="rounded-none border-x-0 border-t-0"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            {connectionStatus.status === 'connected' ? (
              <CheckCircle2 className="h-4 w-4 mr-2 text-green-500" />
            ) : connectionStatus.status === 'checking' ? (
              <div className="animate-spin rounded-full h-4 w-4 border-2 border-t-primary border-r-transparent border-b-primary border-l-transparent mr-2"></div>
            ) : (
              <XCircle className="h-4 w-4 mr-2" />
            )}
            <span className="text-sm font-medium">
              {connectionStatus.status === 'connected' ? 
                `Conectado ao WhatsApp: ${connectionStatus.details?.name || 'Conta WhatsApp'} (${connectionStatus.details?.phone || 'Não disponível'})` : 
                connectionStatus.status === 'checking' ? 'Verificando conexão...' : 
                connectionStatus.message || 'Falha na conexão com a API do WhatsApp'}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Button 
              onClick={() => refreshConnectionStatus()} 
              variant="ghost" 
              size="sm"
              className="h-7 px-2"
              disabled={connectionStatus.status === 'checking'}
            >
              <RefreshCw className="h-3.5 w-3.5 mr-1" />
              Verificar
            </Button>
            <Button 
              onClick={() => window.location.href = '/whatsapp/config'} 
              variant="outline" 
              size="sm"
              className="h-7"
            >
              Configurações
            </Button>
          </div>
        </div>
      </Alert>
      
      {/* Interface principal */}
      <div className="flex flex-1 h-full overflow-hidden">
        {/* Lista de leads (similar à lista de emails) */}
        <div className="w-1/3 border-r overflow-hidden flex flex-col">
          <div className="p-4 border-b">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-semibold">Conversas</h2>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <PlusCircle className="h-5 w-5 text-muted-foreground" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Nova conversa</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder="Buscar contatos, mensagens..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 w-full text-sm"
              />
            </div>
          </div>
          
          <div className="border-b">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="all" className="text-xs">
                  <Inbox className="h-3.5 w-3.5 mr-1.5" />
                  Todos
                </TabsTrigger>
                <TabsTrigger value="novo" className="text-xs">
                  <Badge variant="secondary" className="h-4 w-4 p-0 text-[10px] mr-1.5 flex items-center justify-center">3</Badge>
                  Novos
                </TabsTrigger>
                <TabsTrigger value="contatado" className="text-xs">
                  <Clock className="h-3.5 w-3.5 mr-1.5" />
                  Recentes
                </TabsTrigger>
                <TabsTrigger value="qualificado" className="text-xs">
                  <Star className="h-3.5 w-3.5 mr-1.5" />
                  Favoritos
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
          
          <div className="overflow-y-auto flex-1">
            {isLoading ? (
              <div className="flex justify-center items-center h-full">
                <div className="animate-spin rounded-full h-8 w-8 border-2 border-t-primary border-r-transparent border-b-primary border-l-transparent"></div>
              </div>
            ) : filteredLeads.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center p-4">
                <div className="bg-muted rounded-full p-3 mb-3">
                  <Inbox className="h-5 w-5 text-muted-foreground" />
                </div>
                <h3 className="font-medium mb-1">Nenhuma conversa encontrada</h3>
                <p className="text-sm text-muted-foreground">
                  Não foram encontrados resultados para sua busca.
                </p>
              </div>
            ) : (
              <ul className="divide-y">
                {filteredLeads.map((lead) => (
                  <li 
                    key={lead.id} 
                    className={`hover:bg-muted/50 cursor-pointer transition-colors duration-200 ${selectedLead?.id === lead.id ? 'bg-muted' : ''}`}
                    onClick={() => setSelectedLead(lead)}
                  >
                    <div className="p-3 sm:p-4 flex items-start">
                      <Avatar className="h-10 w-10 mr-3 flex-shrink-0">
                        <AvatarFallback className="bg-primary-light text-white">
                          {lead.name.substring(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between">
                          <h3 className="font-medium text-sm truncate">{lead.name}</h3>
                          <span className="text-xs text-muted-foreground whitespace-nowrap ml-2">
                            {formatMessageDate(lead.updatedAt)}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground truncate mt-1">
                          {lead.phone || 'Sem telefone'}
                        </p>
                        <p className="text-xs truncate mt-0.5">
                          {getLastMessage(lead.id)}
                        </p>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
        
        {/* Área de visualização do chat */}
        <div className="flex-1 overflow-hidden flex flex-col">
          {selectedLead ? (
            <>
              {/* Cabeçalho do chat */}
              <div className="p-4 border-b flex items-center justify-between">
                <div className="flex items-center">
                  <Avatar className="h-9 w-9 mr-3">
                    <AvatarFallback className="bg-primary-light text-white">
                      {selectedLead.name.substring(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <h3 className="font-medium text-sm">{selectedLead.name}</h3>
                    <p className="text-xs text-muted-foreground">{selectedLead.phone || 'Sem telefone'}</p>
                  </div>
                </div>
                <div className="flex items-center space-x-1">
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreVertical className="h-4 w-4 text-muted-foreground" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Mais opções</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
              </div>
              
              {/* Área de mensagens */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3" style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg width=\'20\' height=\'20\' viewBox=\'0 0 40 40\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cg fill=\'%239C92AC\' fill-opacity=\'0.05\' fill-rule=\'evenodd\'%3E%3Cpath d=\'M0 20L20 0h20L0 40z\'/%3E%3Cpath d=\'M20 40L40 20 40 40z\'/%3E%3C/g%3E%3C/svg%3E")' }}>
                {messages.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-center">
                    <div className="bg-muted rounded-full p-4 mb-3">
                      <Inbox className="h-6 w-6 text-muted-foreground" />
                    </div>
                    <h3 className="font-medium mb-1">Nenhuma mensagem ainda</h3>
                    <p className="text-sm text-muted-foreground">
                      Envie uma mensagem para iniciar a conversa.
                    </p>
                    <Button className="mt-4" onClick={() => openWhatsappChat(selectedLead)}>
                      <span className="material-icons text-sm mr-2">chat</span>
                      Iniciar Conversa
                    </Button>
                  </div>
                ) : (
                  <>
                    {messages.map((message) => (
                      <div 
                        key={message.id} 
                        className={`flex ${message.direction === 'outgoing' ? 'justify-end' : 'justify-start'}`}
                      >
                        <div 
                          className={`max-w-xs md:max-w-sm rounded-lg p-3 ${message.direction === 'outgoing' 
                            ? 'bg-primary text-primary-foreground rounded-br-none' 
                            : 'bg-card dark:bg-gray-700 rounded-bl-none'}`}
                        >
                          <p className="whitespace-pre-wrap break-words text-sm">{message.content}</p>
                          <div className="text-xs opacity-80 text-right mt-1 flex justify-end items-center">
                            {formatMessageDate(message.timestamp)}
                            {message.direction === 'outgoing' && (
                              <span className="ml-1">
                                {message.status === 'read' ? (
                                  <span className="text-blue-400">✓✓</span>
                                ) : message.status === 'delivered' ? (
                                  <span>✓✓</span>
                                ) : message.status === 'sent' ? (
                                  <span>✓</span>
                                ) : message.status === 'failed' ? (
                                  <span className="text-red-500">⚠</span>
                                ) : (
                                  <span className="opacity-50">⌛</span>
                                )}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                    {/* Elemento invisível para o scroll automático */}
                    <div ref={endOfMessagesRef} />
                  </>
                )}
              </div>
              
              {/* Campo de entrada de mensagem */}
              <form onSubmit={handleSendMessage} className="p-3 border-t flex items-end">
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button type="button" variant="ghost" size="icon" className="h-9 w-9 mr-1">
                        <Paperclip className="h-5 w-5 text-muted-foreground" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Anexar arquivo</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
                <div className="flex-1 mr-2">
                  <textarea 
                    className="w-full p-2 border rounded-lg focus:outline-none focus:ring-1 focus:ring-primary resize-none min-h-[40px] max-h-32" 
                    placeholder="Digite uma mensagem"
                    rows={1}
                    value={messageText}
                    onChange={(e) => setMessageText(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        if (messageText.trim() && !isSending) {
                          sendMessage(messageText.trim());
                        }
                      }
                    }}
                    disabled={isSending || connectionStatus.status !== 'connected'}
                  />
                </div>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button 
                        type="submit" 
                        className="h-9 w-9 p-0 rounded-full"
                        disabled={!messageText.trim() || isSending || connectionStatus.status !== 'connected'}
                      >
                        {isSending ? (
                          <div className="h-4 w-4 animate-spin rounded-full border-2 border-t-transparent border-white" />
                        ) : (
                          <Send className="h-4 w-4" />
                        )}
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Enviar mensagem</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </form>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-center p-4">
              <div className="bg-muted rounded-full p-6 mb-4">
                <span className="material-icons text-4xl text-muted-foreground">chat</span>
              </div>
              <h2 className="text-xl font-semibold mb-2">Bem-vindo ao WhatsApp</h2>
              <p className="text-muted-foreground max-w-sm mb-6">
                Selecione um contato para iniciar uma conversa ou ver mensagens anteriores.
              </p>
              <p className="text-xs text-muted-foreground">
                {connectionStatus.status === 'connected' ? 
                  '✓ Conectado à API do WhatsApp.' : 
                  '⚠️ Status do WhatsApp: ' + connectionStatus.status}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
