import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  schema: './lib/db/schema.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    url: (process.env.DATABASE_URL || process.env.NEON_POOLING || process.env.NEON_NON_POOLING)!,
  },
});
