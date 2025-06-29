// Exemplo de configuração da API OpenAI
// Copie este arquivo para openai.ts e configure com suas credenciais
export const OPENAI_CONFIG = {
  API_KEY: 'sua-chave-da-api-openai-aqui',
  BASE_URL: 'https://api.openai.com/v1',
  MODEL: 'gpt-3.5-turbo',
  MAX_TOKENS: 1000,
  TEMPERATURE: 0.7
} as const;
