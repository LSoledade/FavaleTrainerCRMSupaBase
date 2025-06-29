import { Store } from 'express-session';
import { db, sql } from './db';
import { httpSessions } from '@shared/schema';
import { eq } from 'drizzle-orm';

export class SupabaseSessionStore extends Store {
  private ttl: number;

  constructor(options: { ttl?: number } = {}) {
    super();
    this.ttl = options.ttl || 86400; // 24 hours default
  }

  async get(sid: string, callback: (err?: any, session?: any) => void): Promise<void> {
    try {
      const [result] = await db
        .select()
        .from(httpSessions)
        .where(eq(httpSessions.sid, sid));

      if (!result) {
        return callback();
      }

      // Check if session has expired
      if (result.expire && new Date() > result.expire) {
        await this.destroy(sid, callback);
        return;
      }

      callback(null, result.sess);
    } catch (error) {
      callback(error);
    }
  }

  async set(sid: string, session: any, callback?: (err?: any) => void): Promise<void> {
    try {
      const expire = new Date(Date.now() + (this.ttl * 1000));
      
      await db
        .insert(httpSessions)
        .values({
          sid,
          sess: session,
          expire
        })
        .onConflictDoUpdate({
          target: httpSessions.sid,
          set: {
            sess: session,
            expire
          }
        });

      if (callback) callback();
    } catch (error) {
      if (callback) callback(error);
    }
  }

  async destroy(sid: string, callback?: (err?: any) => void): Promise<void> {
    try {
      await db
        .delete(httpSessions)
        .where(eq(httpSessions.sid, sid));

      if (callback) callback();
    } catch (error) {
      if (callback) callback(error);
    }
  }

  async touch(sid: string, session: any, callback?: (err?: any) => void): Promise<void> {
    try {
      const expire = new Date(Date.now() + (this.ttl * 1000));
      
      await db
        .update(httpSessions)
        .set({ expire })
        .where(eq(httpSessions.sid, sid));

      if (callback) callback();
    } catch (error) {
      if (callback) callback(error);
    }
  }

  async clear(callback?: (err?: any) => void): Promise<void> {
    try {
      await sql`DELETE FROM http_sessions`;
      if (callback) callback();
    } catch (error) {
      if (callback) callback(error);
    }
  }

  async length(callback: (err?: any, length?: number) => void): Promise<void> {
    try {
      const result = await sql`SELECT COUNT(*) as count FROM http_sessions`;
      const count = parseInt(result[0].count);
      callback(null, count);
    } catch (error) {
      callback(error);
    }
  }

  async all(callback: (err?: any, sessions?: any[]) => void): Promise<void> {
    try {
      const results = await db.select().from(httpSessions);
      const sessions = results.reduce((acc, row) => {
        acc[row.sid] = row.sess;
        return acc;
      }, {} as any);
      callback(null, sessions);
    } catch (error) {
      callback(error);
    }
  }

  // Cleanup expired sessions
  async cleanup(): Promise<void> {
    try {
      await sql`DELETE FROM http_sessions WHERE expire < NOW()`;
    } catch (error) {
      console.error('Error cleaning up expired sessions:', error);
    }
  }
}
