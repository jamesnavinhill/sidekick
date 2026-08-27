import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import * as schema from './schema';

let sql;
try {
  sql = neon(process.env.DATABASE_URL || 'postgres://mock:mock@localhost:5432/mock');
} catch (e) {
  // Ignore error at build time
}
export const db = drizzle(sql as any, { schema });

