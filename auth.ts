import NextAuth from "next-auth"
import Resend from "next-auth/providers/resend"
import { DrizzleAdapter } from "@auth/drizzle-adapter"
import { db } from "./lib/db"
import * as schema from "./lib/db/schema"

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: DrizzleAdapter(db, {
    usersTable: schema.users,
    accountsTable: schema.accounts,
    sessionsTable: schema.sessions,
    verificationTokensTable: schema.verificationTokens,
  secret: process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET || "sidekick-super-secret-auth-key-2026-secure",
  trustHost: true,
  providers: [
    Resend({
      from: process.env.RESEND_FROM || "auth@mail.navinhill.com",
      apiKey: process.env.RESEND_API_KEY,
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
