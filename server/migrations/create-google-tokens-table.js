
import pkg from 'pg';
const { Pool } = pkg;
import dotenv from 'dotenv';

dotenv.config();

async function createGoogleTokensTable() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    // Criar tabela para tokens do Google OAuth2
    await pool.query(`
      CREATE TABLE IF NOT EXISTS google_tokens (
        id SERIAL PRIMARY KEY,
        userId INTEGER NOT NULL,
        accessToken TEXT NOT NULL,
        refreshToken TEXT,
        expiryDate BIGINT NOT NULL,
        updatedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(userId)
      )
    `);

    console.log('✅ Tabela google_tokens criada com sucesso');
  } catch (error) {
    console.error('❌ Erro ao criar tabela google_tokens:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

// Executar se for chamado diretamente
if (import.meta.url === `file://${process.argv[1]}`) {
  createGoogleTokensTable();
}

export { createGoogleTokensTable };
