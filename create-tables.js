import pg from 'pg';
import dotenv from 'dotenv';

const { Pool } = pg;
dotenv.config();

async function createTables() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    console.log('Conectando ao banco de dados PostgreSQL...');
    
    console.log('Criando tabelas se elas não existirem...');

    // Usar SQL direto para criar tabelas na ordem correta
    await pool.query(`
      -- Tabela de usuários
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username TEXT NOT NULL UNIQUE,
        password TEXT NOT NULL,
        role TEXT NOT NULL DEFAULT 'user'
      );

      -- Tabela de leads
      CREATE TABLE IF NOT EXISTS leads (
        id SERIAL PRIMARY KEY,
        entry_date TIMESTAMP NOT NULL DEFAULT NOW(),
        name TEXT NOT NULL,
        email TEXT NOT NULL,
        phone TEXT NOT NULL,
        state TEXT NOT NULL,
        campaign TEXT NOT NULL,
        tags TEXT[] NOT NULL,
        source TEXT NOT NULL,
        status TEXT NOT NULL,
        notes TEXT,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW()
      );

      -- Tabela de treinadores
      CREATE TABLE IF NOT EXISTS trainers (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        email TEXT NOT NULL UNIQUE,
        phone TEXT,
        specialties TEXT[],
        calendar_id TEXT,
        active BOOLEAN NOT NULL DEFAULT TRUE,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW()
      );

      -- Tabela de alunos
      CREATE TABLE IF NOT EXISTS students (
        id SERIAL PRIMARY KEY,
        lead_id INTEGER REFERENCES leads(id),
        address TEXT,
        preferences TEXT,
        source TEXT NOT NULL,
        active BOOLEAN NOT NULL DEFAULT TRUE,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW()
      );

      -- Tabela de sessões
      CREATE TABLE IF NOT EXISTS sessions (
        id SERIAL PRIMARY KEY,
        start_time TIMESTAMP NOT NULL,
        end_time TIMESTAMP NOT NULL,
        student_id INTEGER NOT NULL REFERENCES students(id),
        trainer_id INTEGER NOT NULL REFERENCES trainers(id),
        location TEXT NOT NULL,
        notes TEXT,
        status TEXT NOT NULL DEFAULT 'agendado',
        source TEXT NOT NULL,
        google_event_id TEXT,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW()
      );

      -- Tabela de histórico de sessões
      CREATE TABLE IF NOT EXISTS session_history (
        id SERIAL PRIMARY KEY,
        session_id INTEGER NOT NULL REFERENCES sessions(id),
        changed_at TIMESTAMP NOT NULL DEFAULT NOW(),
        change_type TEXT NOT NULL,
        user_id INTEGER NOT NULL REFERENCES users(id),
        old_value JSONB,
        new_value JSONB
      );

      -- Tabela de mensagens WhatsApp
      CREATE TABLE IF NOT EXISTS whatsapp_messages (
        id SERIAL PRIMARY KEY,
        lead_id INTEGER NOT NULL REFERENCES leads(id),
        direction TEXT NOT NULL,
        content TEXT NOT NULL,
        status TEXT NOT NULL,
        timestamp TIMESTAMP NOT NULL DEFAULT NOW(),
        media_url TEXT,
        media_type TEXT,
        message_id TEXT
      );

      -- Tabela de tarefas
      CREATE TABLE IF NOT EXISTS tasks (
        id SERIAL PRIMARY KEY,
        title TEXT NOT NULL,
        description TEXT,
        assigned_by_id INTEGER NOT NULL REFERENCES users(id),
        assigned_to_id INTEGER NOT NULL REFERENCES users(id),
        due_date TIMESTAMP,
        priority TEXT NOT NULL DEFAULT 'medium',
        status TEXT NOT NULL DEFAULT 'pending',
        related_lead_id INTEGER REFERENCES leads(id),
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW()
      );

      -- Tabela de comentários em tarefas
      CREATE TABLE IF NOT EXISTS task_comments (
        id SERIAL PRIMARY KEY,
        task_id INTEGER NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
        user_id INTEGER NOT NULL REFERENCES users(id),
        content TEXT NOT NULL,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW()
      );

      -- Tabela de configurações do WhatsApp/Evolution API
      CREATE TABLE IF NOT EXISTS whatsapp_settings (
        id SERIAL PRIMARY KEY,
        api_url TEXT NOT NULL,
        api_token TEXT NOT NULL,
        api_instance TEXT NOT NULL,
        updated_at TIMESTAMP NOT NULL DEFAULT NOW()
      );
    `);

    console.log('Tabelas criadas com sucesso!');

    // Criar um usuário administrador padrão se não existir
    await pool.query(`
      INSERT INTO users (username, password, role)
      SELECT 'admin', '6b86b273ff34fce19d6b804eff5a3f5747ada4eaa22f1d49c01e52ddb7875b4b.d16fb36f027d1f03df5b55c19a97f5348270210146e38d0c657a683b3d774732', 'admin'
      WHERE NOT EXISTS (SELECT 1 FROM users WHERE username = 'admin')
    `);

    console.log('Usuário admin criado com sucesso!');
  } catch (error) {
    console.error('Erro ao criar tabelas:', error);
  } finally {
    await pool.end();
  }
}

createTables();