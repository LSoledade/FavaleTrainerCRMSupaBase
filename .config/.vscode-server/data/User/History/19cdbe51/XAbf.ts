// Configuração da API OpenAI
// Esta chave deve ser mantida segura e não exposta publicamente
export const OPENAI_CONFIG = {
  API_KEY: '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',
  BASE_URL: 'https://api.openai.com/v1',
  MODEL: 'gpt-3.5-turbo',
  MAX_TOKENS: 1000,
  TEMPERATURE: 0.7
} as const;
