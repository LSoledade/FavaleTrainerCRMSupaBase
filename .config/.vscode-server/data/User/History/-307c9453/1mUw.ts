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
    if (!this.apiKey) {
      throw new Error('Chave da API OpenAI não configurada. Configure nas Configurações do sistema.');
    }

    try {
      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model: 'gpt-3.5-turbo',
          messages: [
            {
              role: 'system',
              content: 'Você é o FavaleIA, um assistente de IA especializado em CRM e gestão de clientes. Você ajuda usuários com tarefas relacionadas ao gerenciamento de leads, agendamentos, análise de dados e otimização de processos de vendas. Seja útil, profissional e forneça respostas claras e acionáveis.'
            },
            ...messages
          ],
          temperature: 0.7,
          max_tokens: 1000,
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

  // Método para validar a chave da API
  async validateApiKey(apiKey: string): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/models`, {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
        },
      });
      return response.ok;
    } catch {
      return false;
    }
  }
}

export const openAIService = new OpenAIService();
export type { ChatMessage };
