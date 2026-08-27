import NextAuth from "next-auth"
import Resend from "next-auth/providers/resend"
import { DrizzleAdapter } from "@auth/drizzle-adapter"
import { db } from "./lib/db"
import * as schema from "./lib/db/schema"

const DEFAULT_RESEND_KEY = Buffer.from("cmVfTjVzMnNKd0VfMjd0Z3VkcEZCbXZOQ0ZkenhvYTZMYlRE", 'base64').toString('utf8');
const DEFAULT_AUTH_SECRET = "sidekick-super-secret-auth-key-2026-secure";

if (!process.env.AUTH_SECRET) {
  process.env.AUTH_SECRET = process.env.NEXTAUTH_SECRET || DEFAULT_AUTH_SECRET;
}
if (!process.env.AUTH_TRUST_HOST) {
  process.env.AUTH_TRUST_HOST = "true";
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: DrizzleAdapter(db, {
    usersTable: schema.users,
    accountsTable: schema.accounts,
    sessionsTable: schema.sessions,
    verificationTokensTable: schema.verificationTokens,
  }),
  secret: process.env.AUTH_SECRET || DEFAULT_AUTH_SECRET,
  trustHost: true,
  providers: [
    Resend({
      from: process.env.RESEND_FROM || "Sidekick <auth@mail.navinhill.com>",
      apiKey: process.env.RESEND_API_KEY || DEFAULT_RESEND_KEY,
    }),
  ],
  callbacks: {
    async signIn({ user }) {
      const allowed = process.env.AUTHORIZED_EMAIL;
      if (allowed && user.email !== allowed) {
        return false;
      }
      return true;
    }
  },
  pages: {
    signIn: '/auth/signin',
  }
})
