import { pgTable, text, timestamp, uuid, jsonb, primaryKey, integer } from 'drizzle-orm/pg-core';
import type { AdapterAccountType } from 'next-auth/adapters';

export const users = pgTable("user", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  name: text("name"),
  email: text("email").unique(),
  emailVerified: timestamp("emailVerified", { mode: "date" }),
  image: text("image"),
});

export const accounts = pgTable(
  "account",
  {
    userId: text("userId").notNull().references(() => users.id, { onDelete: "cascade" }),
    type: text("type").$type<AdapterAccountType>().notNull(),
    provider: text("provider").notNull(),
    providerAccountId: text("providerAccountId").notNull(),
    refresh_token: text("refresh_token"),
    access_token: text("access_token"),
    expires_at: integer("expires_at"),
    token_type: text("token_type"),
    scope: text("scope"),
    id_token: text("id_token"),
    session_state: text("session_state"),
  },
  (account) => [primaryKey({ columns: [account.provider, account.providerAccountId] })]
);

export const sessions = pgTable("session", {
  sessionToken: text("sessionToken").primaryKey(),
  userId: text("userId").notNull().references(() => users.id, { onDelete: "cascade" }),
  expires: timestamp("expires", { mode: "date" }).notNull(),
});

export const verificationTokens = pgTable(
  "verificationToken",
  {
    identifier: text("identifier").notNull(),
    token: text("token").notNull(),
    expires: timestamp("expires", { mode: "date" }).notNull(),
  },
  (vt) => [primaryKey({ columns: [vt.identifier, vt.token] })]
);

export const reports = pgTable('reports', {
  id: uuid('id').primaryKey().defaultRandom(),
  status: text('status').notNull().default('processing'), // processing, completed, error
  emailSentTo: text('email_sent_to'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

export const reportImages = pgTable('report_images', {
  id: uuid('id').primaryKey().defaultRandom(),
  reportId: uuid('report_id').references(() => reports.id, { onDelete: 'cascade' }).notNull(),
  base64Data: text('base64_data').notNull(),
  description: text('description'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

export const settings = pgTable('settings', {
  id: text('id').primaryKey(), // just use a constant string like 'global'
  systemPrompt: text('system_prompt').notNull().default('Please describe this property move-out photo concisely, focusing on condition, damages, and details relevant for chargebacks. No fluff.'),
  activeAiProvider: text('active_ai_provider').notNull().default('gemini'), // 'gemini' or 'openai-compatible'
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});
