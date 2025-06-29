import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Send, Bot, User, Plus, MessageSquare } from 'lucide-react';
import { cn } from '@/lib/utils';
import { openAIService, type ChatMessage } from '@/services/openai';
import { MarkdownRenderer } from '@/components/ui/MarkdownRenderer';

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
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [currentConversation, setCurrentConversation] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [conversations]);

  const createNewConversation = () => {
    const newConversation: Conversation = {
      id: Date.now().toString(),
      title: 'Nova Conversa',
      messages: [],
      createdAt: new Date()
    };
    setConversations(prev => [newConversation, ...prev]);
    setCurrentConversation(newConversation.id);
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
        return {
          ...conv,
          messages: updatedMessages,
          title: conv.messages.length === 0 ? content.slice(0, 30) + '...' : conv.title
        };
      }
      return conv;
    }));
  };

  const sendMessage = async () => {
    if (!message.trim() || isLoading) return;

    if (!currentConversation) {
      createNewConversation();
      return;
    }

    const userMessage = message;
    setMessage('');
    setIsLoading(true);

    // Adiciona mensagem do usuário
    addMessage(userMessage, 'user');

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

  return (
    <div className="h-screen flex bg-background overflow-hidden">
      {/* Sidebar com conversas - Layout fixo */}
      <div className="w-80 border-r border-border bg-card flex flex-col">
        <div className="p-4 border-b border-border flex-shrink-0">
          <Button
            onClick={createNewConversation}
            className="w-full bg-primary hover:bg-primary/90"
          >
            <Plus className="w-4 h-4 mr-2" />
            Nova Conversa
          </Button>
        </div>
        
        <ScrollArea className="flex-1">
          <div className="p-2">
            {conversations.map((conversation) => (
              <Card
                key={conversation.id}
                className={cn(
                  "mb-2 cursor-pointer transition-colors hover:bg-accent",
                  currentConversation === conversation.id && "bg-accent border-primary"
                )}
                onClick={() => setCurrentConversation(conversation.id)}
              >
                <CardContent className="p-3">
                  <div className="flex items-center space-x-2">
                    <MessageSquare className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">
                        {conversation.title}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {conversation.messages.length} mensagens
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </ScrollArea>
      </div>

      {/* Área principal do chat - Layout fixo */}
      <div className="flex-1 flex flex-col min-w-0">{/* min-w-0 previne overflow */}
        {currentConversation ? (
          <>
            {/* Header do chat */}
            <div className="p-4 border-b border-border bg-card">
              <div className="flex items-center space-x-3">
                <Avatar className="w-8 h-8">
                  <AvatarFallback className="bg-primary text-primary-foreground">
                    <Bot className="w-4 h-4" />
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h1 className="text-lg font-semibold">FavaleIA</h1>
                  <p className="text-sm text-muted-foreground">
                    Assistente de IA para seu CRM
                  </p>
                </div>
              </div>
            </div>

            {/* Mensagens */}
            <ScrollArea className="flex-1 p-4">
              <div className="space-y-4 max-w-4xl mx-auto">
                {getCurrentConversation()?.messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={cn(
                      "flex space-x-3",
                      msg.role === 'user' ? "flex-row-reverse space-x-reverse" : ""
                    )}
                  >
                    <Avatar className="w-8 h-8 flex-shrink-0">
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
                      "max-w-[70%] rounded-lg p-3 text-sm",
                      msg.role === 'assistant'
                        ? "bg-card border border-border"
                        : "bg-primary text-primary-foreground"
                    )}>
                      <p className="whitespace-pre-wrap">{msg.content}</p>
                      <p className={cn(
                        "text-xs mt-1 opacity-70",
                        msg.role === 'assistant' ? "text-muted-foreground" : "text-primary-foreground/70"
                      )}>
                        {msg.timestamp.toLocaleTimeString()}
                      </p>
                    </div>
                  </div>
                ))}
                
                {isLoading && (
                  <div className="flex space-x-3">
                    <Avatar className="w-8 h-8">
                      <AvatarFallback className="bg-primary text-primary-foreground">
                        <Bot className="w-4 h-4" />
                      </AvatarFallback>
                    </Avatar>
                    <div className="bg-card border border-border rounded-lg p-3 text-sm">
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
            </ScrollArea>

            {/* Input de mensagem */}
            <div className="p-4 border-t border-border bg-card">
              <div className="max-w-4xl mx-auto flex space-x-2">
                <Input
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Digite sua mensagem..."
                  className="flex-1"
                  disabled={isLoading}
                />
                <Button
                  onClick={sendMessage}
                  disabled={!message.trim() || isLoading}
                  className="bg-primary hover:bg-primary/90"
                >
                  <Send className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </>
        ) : (
          // Estado inicial - nenhuma conversa selecionada
          <div className="flex-1 flex items-center justify-center bg-background">
            <div className="text-center space-y-4">
              <Avatar className="w-16 h-16 mx-auto">
                <AvatarFallback className="bg-primary text-primary-foreground text-2xl">
                  <Bot className="w-8 h-8" />
                </AvatarFallback>
              </Avatar>
              <div className="space-y-2">
                <h2 className="text-2xl font-bold">Bem-vindo ao FavaleIA</h2>
                <p className="text-muted-foreground max-w-md">
                  Seu assistente de IA para o CRM. Comece uma nova conversa para receber ajuda 
                  inteligente com suas tarefas.
                </p>
              </div>
              <Button onClick={createNewConversation} className="bg-primary hover:bg-primary/90">
                <Plus className="w-4 h-4 mr-2" />
                Começar Conversa
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
