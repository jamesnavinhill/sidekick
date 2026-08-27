import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import * as schema from './schema';

let connectionString = process.env.DATABASE_URL || process.env.NEON_POOLING || process.env.NEON_NON_POOLING || 'postgres://mock:mock@localhost:5432/mock';
let sql;
try {
  sql = neon(connectionString);
} catch (e) {
  // Ignore error at build time
}
export const db = drizzle(sql as any, { schema });

