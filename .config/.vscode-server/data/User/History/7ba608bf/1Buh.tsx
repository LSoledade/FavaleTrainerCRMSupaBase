import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Send, Bot, User, Plus, MessageSquare, Trash2, MoreVertical, Coffee } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { openAIService, type ChatMessage } from '@/services/openai';
import { MarkdownRenderer } from '@/components/ui/MarkdownRenderer';
import { useAuth } from '@/hooks/use-auth';

interface Message {
  id: string;
  content: string;
  role: 'user' | 'assistant';
  timestamp: Date;
}

interface Conversation {
  id: string;
  title: string;
  messages: Message[];
  createdAt: Date;
}

export function FavaleIAPage() {
  const { user } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [currentConversation, setCurrentConversation] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Função para obter saudação baseada na hora do dia
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Bom dia';
    if (hour < 18) return 'Boa tarde';
    return 'Boa noite';
  };

  // Carrega conversas do localStorage na inicialização
  useEffect(() => {
    const savedConversations = localStorage.getItem('favale-ia-conversations');
    if (savedConversations) {
      try {
        const parsed = JSON.parse(savedConversations);
        const conversationsWithDates = parsed.map((conv: any) => ({
          ...conv,
          createdAt: new Date(conv.createdAt),
          messages: conv.messages.map((msg: any) => ({
            ...msg,
            timestamp: new Date(msg.timestamp)
          }))
        }));
        setConversations(conversationsWithDates);
      } catch (error) {
        console.error('Erro ao carregar conversas:', error);
      }
    }
  }, []);

  // Salva conversas no localStorage sempre que mudam
  useEffect(() => {
    if (conversations.length > 0) {
      localStorage.setItem('favale-ia-conversations', JSON.stringify(conversations));
    }
  }, [conversations]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Referência para o campo de entrada na interface de chat
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Só faz scroll quando há mensagens na conversa atual e não quando cria nova conversa
    const currentConv = getCurrentConversation();
    if (currentConv && currentConv.messages.length > 0) {
      scrollToBottom();
      
      // Foca o input após uma pequena pausa para permitir que as animações terminem
      setTimeout(() => {
        inputRef.current?.focus();
      }, 300);
    }
  }, [conversations, currentConversation]);

  const createNewConversation = () => {
    const newConversation: Conversation = {
      id: Date.now().toString(),
      title: 'Nova Conversa',
      messages: [],
      createdAt: new Date()
    };
    setConversations(prev => [newConversation, ...prev]);
    setCurrentConversation(newConversation.id);
    // Limpa a mensagem se houver alguma pendente
    setMessage('');
  };

  const deleteConversation = (conversationId: string) => {
    setConversations(prev => prev.filter(conv => conv.id !== conversationId));
    if (currentConversation === conversationId) {
      setCurrentConversation(null);
    }
  };

  const clearAllConversations = () => {
    setConversations([]);
    setCurrentConversation(null);
    localStorage.removeItem('favale-ia-conversations');
  };

  const getCurrentConversation = () => {
    return conversations.find(conv => conv.id === currentConversation);
  };

  const addMessage = (content: string, role: 'user' | 'assistant') => {
    if (!currentConversation) return;

    const newMessage: Message = {
      id: Date.now().toString(),
      content,
      role,
      timestamp: new Date()
    };

    setConversations(prev => prev.map(conv => {
      if (conv.id === currentConversation) {
        const updatedMessages = [...conv.messages, newMessage];
        // Cria um título mais inteligente baseado na primeira mensagem do usuário
        let newTitle = conv.title;
        if (conv.messages.length === 0 && role === 'user') {
          // Extrai palavras-chave da primeira mensagem para criar um título mais descritivo
          const keywords = content
            .toLowerCase()
            .split(' ')
            .filter(word => word.length > 3)
            .slice(0, 3)
            .join(' ');
          newTitle = keywords.length > 0 
            ? keywords.charAt(0).toUpperCase() + keywords.slice(1)
            : content.slice(0, 30) + '...';
        }
        return {
          ...conv,
          messages: updatedMessages,
          title: newTitle
        };
      }
      return conv;
    }));
  };

  const sendMessage = async () => {
    if (!message.trim() || isLoading) return;

    const userMessage = message;
    setMessage('');
    setIsLoading(true);

    // Se não tiver conversa atual, cria uma nova e então continua o fluxo
    if (!currentConversation) {
      const newConversation: Conversation = {
        id: Date.now().toString(),
        title: userMessage.slice(0, 30) + (userMessage.length > 30 ? '...' : ''),
        messages: [],
        createdAt: new Date()
      };
      
      setConversations(prev => [newConversation, ...prev]);
      setCurrentConversation(newConversation.id);
      
      // Pequeno timeout para garantir que a conversa foi criada antes de adicionar mensagem
      setTimeout(() => {
        addMessage(userMessage, 'user');
      }, 50);
    } else {
      // Adiciona mensagem do usuário
      addMessage(userMessage, 'user');
    }

    try {
      // Prepara histórico de mensagens para a API
      const currentConv = getCurrentConversation();
      const chatMessages: ChatMessage[] = [
        ...(currentConv?.messages.map(msg => ({
          role: msg.role,
          content: msg.content
        })) || []),
        { role: 'user', content: userMessage }
      ];

      // Chama a API da OpenAI
      const response = await openAIService.sendMessage(chatMessages);
      addMessage(response, 'assistant');
    } catch (error) {
      console.error('Erro ao enviar mensagem:', error);
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido ao processar sua mensagem.';
      addMessage(errorMessage, 'assistant');
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  // Adiciona classes para animação de transição entre estados
  const chatAreaClasses = cn(
    "flex-1 flex flex-col h-full min-w-0 bg-card border border-border overflow-hidden",
    "transition-all duration-300 ease-in-out"
  );

  return (
    <div className="h-full w-full flex bg-background overflow-hidden">
      {/* Sidebar com conversas - Layout fixo */}
      <div className="w-80 border-r border-border bg-card flex flex-col h-full">
        {/* Header da sidebar - fixo */}
        <div className="p-4 border-b border-border flex-shrink-0 bg-card">
          <div className="flex items-center space-x-2">
            <Button
              onClick={createNewConversation}
              className="flex-1 bg-primary hover:bg-primary/90"
            >
              <Plus className="w-4 h-4 mr-2" />
              Nova Conversa
            </Button>
            
            {conversations.length > 0 && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-10 w-10 p-0">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuItem
                    onClick={clearAllConversations}
                    className="text-red-600 focus:text-red-600"
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Limpar todas as conversas
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </div>
        
        {/* Lista de conversas - scroll interno */}
        <div className="flex-1 overflow-y-auto">
          <div className="p-2">
            {conversations.map((conversation) => (
              <Card
                key={conversation.id}
                className={cn(
                  "mb-2 cursor-pointer transition-colors hover:bg-accent group",
                  currentConversation === conversation.id && "bg-accent border-primary"
                )}
              >
                <CardContent className="p-3">
                  <div className="flex items-center space-x-2">
                    <MessageSquare className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                    <div 
                      className="flex-1 min-w-0" 
                      onClick={() => setCurrentConversation(conversation.id)}
                    >
                      <p className="text-sm font-medium truncate">
                        {conversation.title}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {conversation.messages.length} mensagens
                      </p>
                    </div>
                    
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 hover:bg-accent/50"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <MoreVertical className="h-3 w-3" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-48">
                        <DropdownMenuItem
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteConversation(conversation.id);
                          }}
                          className="text-red-600 focus:text-red-600"
                        >
                          <Trash2 className="w-4 h-4 mr-2" />
                          Excluir conversa
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>

      {/* Área principal do chat - Layout fixo */}
      <div className={chatAreaClasses}>
        {currentConversation ? (
          <>
            {/* Header do chat - Layout fixo */}
            <div className="p-4 border-b border-border bg-card flex-shrink-0">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <Avatar className="w-8 h-8 flex-shrink-0">
                    <AvatarFallback className="bg-primary text-primary-foreground">
                      <Bot className="w-4 h-4" />
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <h1 className="text-lg font-semibold truncate">FavaleIA</h1>
                    <p className="text-sm text-muted-foreground truncate">
                      Assistente de IA para seu CRM
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <Coffee className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm font-medium text-muted-foreground">
                    {getGreeting()}, {user?.username || 'Visitante'}
                  </span>
                </div>
              </div>
            </div>

            {/* Mensagens - Área com scroll interno */}
            <div className="flex-1 overflow-y-auto min-h-0">
              <div className="p-4 h-full">
                <div className="space-y-6 max-w-4xl mx-auto pb-4">
                  {getCurrentConversation()?.messages.map((msg) => (
                    <div
                      key={msg.id}
                      className={cn(
                        "flex space-x-3",
                        msg.role === 'user' ? "flex-row-reverse space-x-reverse" : ""
                      )}
                    >
                      <Avatar className="w-8 h-8 flex-shrink-0 mt-1">
                        <AvatarFallback className={cn(
                          msg.role === 'assistant' 
                            ? "bg-primary text-primary-foreground" 
                            : "bg-secondary"
                        )}>
                          {msg.role === 'assistant' ? (
                            <Bot className="w-4 h-4" />
                          ) : (
                            <User className="w-4 h-4" />
                          )}
                        </AvatarFallback>
                      </Avatar>
                      
                      <div className={cn(
                        "max-w-[85%] rounded-lg p-4 text-sm min-w-0", // min-w-0 para quebra de linha
                        msg.role === 'assistant'
                          ? "bg-card border border-border"
                          : "bg-primary text-primary-foreground"
                      )}>
                        {msg.role === 'assistant' ? (
                          <MarkdownRenderer 
                            content={msg.content}
                            className={cn(
                              "prose-sm",
                              "prose-headings:text-foreground",
                              "prose-p:text-foreground",
                              "prose-strong:text-foreground",
                              "prose-code:text-foreground",
                              "prose-pre:bg-muted/50"
                            )}
                          />
                        ) : (
                          <p className="whitespace-pre-wrap break-words">{msg.content}</p>
                        )}
                        <p className={cn(
                          "text-xs mt-2 opacity-70",
                          msg.role === 'assistant' ? "text-muted-foreground" : "text-primary-foreground/70"
                        )}>
                          {msg.timestamp.toLocaleTimeString()}
                        </p>
                      </div>
                    </div>
                  ))}
                  
                  {isLoading && (
                    <div className="flex space-x-3">
                      <Avatar className="w-8 h-8 flex-shrink-0 mt-1">
                        <AvatarFallback className="bg-primary text-primary-foreground">
                          <Bot className="w-4 h-4" />
                        </AvatarFallback>
                      </Avatar>
                      <div className="bg-card border border-border rounded-lg p-4 text-sm">
                        <div className="flex space-x-1">
                          <div className="w-2 h-2 bg-primary rounded-full animate-bounce"></div>
                          <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                          <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  <div ref={messagesEndRef} />
                </div>
              </div>
            </div>

            {/* Input de mensagem - Layout fixo */}
            <div className="p-4 border-t border-border bg-card flex-shrink-0">
              <div className="max-w-4xl mx-auto flex space-x-3">
                <Input
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Digite sua mensagem..."
                  className="flex-1 min-w-0"
                  disabled={isLoading}
                />
                <Button
                  onClick={sendMessage}
                  disabled={!message.trim() || isLoading}
                  className="bg-primary hover:bg-primary/90 flex-shrink-0"
                >
                  <Send className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </>
        ) : (
          // Estado inicial - nenhuma conversa selecionada, agora parecido com o Claude
          <div className="flex-1 flex flex-col bg-background h-full overflow-hidden">
            <div className="flex-1 flex flex-col items-center p-8">
              <div className="flex items-center justify-center space-x-2 mt-10 mb-10">
                <div className="flex items-center space-x-2">
                  <Coffee className="w-5 h-5 text-primary" />
                  <h1 className="text-xl text-primary font-medium">{getGreeting()}, {user?.username || 'Visitante'}</h1>
                </div>
              </div>
              
              <div className="w-full max-w-3xl mx-auto" style={{ marginTop: '20vh' }}>
                <div className="border border-border rounded-lg shadow-sm bg-card transition-all duration-300 ease-in-out">
                  <div className="flex items-center p-4">
                    <Input
                      autoFocus
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      onKeyPress={handleKeyPress}
                      placeholder="Como posso ajudar você hoje?"
                      className="flex-1 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 border-0 focus-visible:border-0"
                    />
                    <Button
                      onClick={sendMessage}
                      disabled={!message.trim() || isLoading}
                      className="bg-primary hover:bg-primary/90 ml-2"
                    >
                      <Send className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
