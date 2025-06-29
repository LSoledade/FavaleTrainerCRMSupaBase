// Configuração da API OpenAI
// Esta chave deve ser mantida segura e não exposta publicamente
export const OPENAI_CONFIG = {
  API_KEY: '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',
  BASE_URL: 'https://api.openai.com/v1',
  MODEL: 'gpt-4o-mini',
  MAX_TOKENS: 2000,
  TEMPERATURE: 0.7,
  CONTEXT_WINDOW: 10 // Número de mensagens anteriores para manter como contexto
} as const;
