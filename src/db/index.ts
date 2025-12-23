/**
 * Connect to PostgreSQL Database (Supabase/Neon/Local PostgreSQL)
 * https://orm.drizzle.team/docs/tutorials/drizzle-with-supabase
 */
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

let db: ReturnType<typeof drizzle> | null = null;

/**
 * Get database connection synchronously (lazy connection)
 * postgres-js creates connections lazily on first query, not on instantiation
 * This is safe to use at module top-level without blocking
 */
export function getDbSync() {
  if (db) return db;
  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    console.warn('⚠️ DATABASE_URL is not set. Database features will not work.');
    throw new Error('DATABASE_URL is not set in environment variables.');
  }

  const client = postgres(connectionString, {
    prepare: false,
    connect_timeout: 30, // Increase timeout for slow connections
    idle_timeout: 20, // Close idle connections after 20s
    max: 5, // Reduce max connections to avoid pool exhaustion
    max_lifetime: 60 * 5, // 5 minutes max connection lifetime
    onnotice: () => {}, // Suppress notices
  });
  db = drizzle(client, { schema });
  return db;
}

/**
 * Get database connection asynchronously (for backwards compatibility)
 */
export async function getDb() {
  return getDbSync();
}

/**
 * Connect to Neon Database
 * https://orm.drizzle.team/docs/tutorials/drizzle-with-neon
 */
// import { drizzle } from 'drizzle-orm/neon-http';
// const db = drizzle(process.env.DATABASE_URL!);

/**
 * Database connection with Drizzle
 * https://orm.drizzle.team/docs/connect-overview
 *
 * Drizzle <> PostgreSQL
 * https://orm.drizzle.team/docs/get-started-postgresql
 *
 * Get Started with Drizzle and Neon
 * https://orm.drizzle.team/docs/get-started/neon-new
 *
 * Drizzle with Neon Postgres
 * https://orm.drizzle.team/docs/tutorials/drizzle-with-neon
 *
 * Drizzle <> Neon Postgres
 * https://orm.drizzle.team/docs/connect-neon
 *
 * Drizzle with Supabase Database
 * https://orm.drizzle.team/docs/tutorials/drizzle-with-supabase
 */
