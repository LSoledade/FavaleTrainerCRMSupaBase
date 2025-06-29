import { OPENAI_CONFIG } from '@/config/openai';

interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

interface ChatCompletionResponse {
  choices: {
    message: {
      content: string;
      role: string;
    };
  }[];
}

class OpenAIService {
  private apiKey: string;
  private baseUrl: string;

  constructor() {
    // Usa a chave da API configurada no sistema
    this.apiKey = OPENAI_CONFIG.API_KEY;
    this.baseUrl = OPENAI_CONFIG.BASE_URL;
  }

  hasApiKey(): boolean {
    return !!this.apiKey;
  }

  async sendMessage(messages: ChatMessage[]): Promise<string> {
    try {
      // Limita o contexto para evitar exceder o limite de tokens
      const contextMessages = messages.slice(-OPENAI_CONFIG.CONTEXT_WINDOW);
      
      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model: OPENAI_CONFIG.MODEL,
          messages: [
            {
              role: 'system',
              content: `Você é o FavaleIA, um assistente de IA especializado em CRM e gestão de clientes da Favale Pink Personal Training. 

INSTRUÇÕES DE FORMATAÇÃO (MUITO IMPORTANTE):
- SEMPRE formate suas respostas usando Markdown
- Use **negrito** para destacar informações importantes
- Use bullet points (•) para listas
- Use \`código\` para termos técnicos ou nomes de campos
- Use blocos de código \`\`\`javascript para códigos
- Seja visual e bem estruturado

CONTEXTO E MEMÓRIA:
- Lembre-se das informações compartilhadas durante a conversa
- Faça referência a dados anteriores quando relevante
- Mantenha continuidade nas conversas
- Se o usuário mencionar leads, clientes ou agendamentos, refira-se a eles especificamente

ESPECIALIDADES:
• **Gestão de Leads**: Análise, qualificação e conversão
• **Agendamentos**: Organização de treinos e consultas
• **Análise de Dados**: Relatórios e insights de performance
• **Processos de Vendas**: Otimização e automação
• **Relacionamento**: Estratégias de retenção e fidelização

Seja útil, profissional e forneça respostas claras e acionáveis sempre bem formatadas.`
            },
            ...contextMessages
          ],
          temperature: OPENAI_CONFIG.TEMPERATURE,
          max_tokens: OPENAI_CONFIG.MAX_TOKENS,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error?.message || `Erro da API: ${response.status}`);
      }

      const data: ChatCompletionResponse = await response.json();
      return data.choices[0]?.message?.content || 'Desculpe, não consegui gerar uma resposta.';
    } catch (error) {
      console.error('Erro ao chamar OpenAI:', error);
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Erro desconhecido ao comunicar com a API OpenAI');
    }
  }

}

export const openAIService = new OpenAIService();
export type { ChatMessage };
