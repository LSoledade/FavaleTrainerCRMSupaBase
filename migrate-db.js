// Script para criar tabelas no banco de dados PostgreSQL
import 'dotenv/config';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';

async function main() {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL não foi configurado. Verifique suas variáveis de ambiente.');
  }

  console.log('Conectando ao banco de dados PostgreSQL...');
  const sql = postgres(process.env.DATABASE_URL, { prepare: false });
  const db = drizzle(sql);

  console.log('Criando tabelas se elas não existirem...');

  // Criar tabelas uma por uma
  await sql`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      username TEXT NOT NULL UNIQUE,
      password TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'user'
    )
  `;

  await sql`
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
    )
  `;

  await sql`
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
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS students (
      id SERIAL PRIMARY KEY,
      lead_id INTEGER REFERENCES leads(id),
      address TEXT,
      preferences TEXT,
      source TEXT NOT NULL,
      active BOOLEAN NOT NULL DEFAULT TRUE,
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMP NOT NULL DEFAULT NOW()
    )
  `;

  await sql`
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
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS session_history (
      id SERIAL PRIMARY KEY,
      session_id INTEGER NOT NULL REFERENCES sessions(id),
      changed_at TIMESTAMP NOT NULL DEFAULT NOW(),
      change_type TEXT NOT NULL,
      user_id INTEGER NOT NULL REFERENCES users(id),
      old_value JSONB,
      new_value JSONB
    )
  `;

  await sql`
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
    )
  `;

  await sql`
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
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS task_comments (
      id SERIAL PRIMARY KEY,
      task_id INTEGER NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
      user_id INTEGER NOT NULL REFERENCES users(id),
      content TEXT NOT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMP NOT NULL DEFAULT NOW()
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS http_sessions (
      sid TEXT PRIMARY KEY,
      sess JSONB NOT NULL,
      expire TIMESTAMP NOT NULL
    )
  `;

  console.log('Tabelas criadas com sucesso!');

  // Criar usuário Leonardo com senha 123asdfg se não existir
  await sql`
    INSERT INTO users (username, password, role)
    SELECT 'leonardo', 'd8a1ba6da5274e42f686b9ca511599c57f38bbdda19d1e59514bafaaf779e139beb243c2e844e196ba9135c11ec0bfb9162ef7f6470200cb46640f4c2191625c5.b8ea39c3adccd231fecf045cefd1678f0', 'admin'
    WHERE NOT EXISTS (SELECT 1 FROM users WHERE username = 'leonardo')
  `;

  console.log('Usuário Leonardo criado com sucesso!');

  await sql.end();
}

main().catch(error => {
  console.error('Erro ao migrar tabelas:', error);
  process.exit(1);
});