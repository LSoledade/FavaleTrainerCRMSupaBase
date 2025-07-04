import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from "@shared/schema";

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

// Configuração para Supabase
const connectionString = process.env.DATABASE_URL;
export const sql = postgres(connectionString, { prepare: false });
export const db = drizzle(sql, { schema });
