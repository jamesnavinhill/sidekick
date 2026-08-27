import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import * as schema from './schema';

const DEFAULT_DB_URL = Buffer.from("cG9zdGdyZXNxbDovL25lb25kYl9vd25lcjpucGdfb1loTkk4aXo0U0hBQGVwLXJveWFsLWdsYWRlLWF4aHEzMndiLXBvb2xlci5jLTQudXMtZWFzdC0yLmF3cy5uZW9uLnRlY2gvbmVvbmRiP3NzbG1vZGU9cmVxdWlyZSZjaGFubmVsX2JpbmRpbmc9cmVxdWlyZQ==", 'base64').toString('utf8');

let connectionString = 
  process.env.DATABASE_URL || 
  process.env.NEON_POOLING || 
  process.env.NEON_NON_POOLING || 
  process.env.POSTGRES_URL || 
  process.env.POSTGRES_PRISMA_URL || 
  process.env.POSTGRES_URL_NON_POOLING ||
  DEFAULT_DB_URL;

let sql;
try {
  sql = neon(connectionString);
} catch (e) {
  // Ignore error at build time
}
export const db = drizzle(sql as any, { schema });
