import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { sql } from 'drizzle-orm';
import { Resend } from 'resend';
import { GoogleGenAI } from '@google/genai';

export const runtime = 'nodejs';

export async function GET() {
  const version = "build-2026-08-27-v2";
  const envCheck = {
    DATABASE_URL: !!process.env.DATABASE_URL,
    NEON_POOLING: !!process.env.NEON_POOLING,
    NEON_NON_POOLING: !!process.env.NEON_NON_POOLING,
    POSTGRES_URL: !!process.env.POSTGRES_URL,
    RESEND_API_KEY: !!process.env.RESEND_API_KEY,
    AUTH_SECRET: !!process.env.AUTH_SECRET,
    AUTH_TRUST_HOST: !!process.env.AUTH_TRUST_HOST,
    GEMINI_API_KEY: !!process.env.GEMINI_API_KEY,
    AUTHORIZED_EMAIL: process.env.AUTHORIZED_EMAIL || '(none - open to all)',
  };

  let dbStatus = 'unknown';
  let dbTables: any[] = [];
  try {
    const res = await db.execute(sql`SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'`);
    dbStatus = 'connected';
    dbTables = res.rows.map((r: any) => r.table_name);
  } catch (e: any) {
    dbStatus = `failed: ${e.message}`;
  }

  let resendStatus = 'unknown';
  try {
    const resend = new Resend(process.env.RESEND_API_KEY);
    const d = await resend.domains.list();
    resendStatus = `connected, domains: ${JSON.stringify(d.data?.data?.map((item: any) => item.name))}`;
  } catch (e: any) {
    resendStatus = `failed: ${e.message}`;
  }

  let geminiStatus = 'unknown';
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    const r = await ai.models.generateContent({
      model: process.env.GEMINI_MODEL || 'gemini-2.5-flash',
      contents: ['Respond with exact text: OK']
    });
    geminiStatus = `ok: ${r.text?.trim()}`;
  } catch (e: any) {
    geminiStatus = `failed: ${e.message}`;
  }

  return NextResponse.json({
    version,
    status: 'ok',
    environment: envCheck,
    db: { status: dbStatus, tables: dbTables },
    resend: resendStatus,
    gemini: geminiStatus,
  });
}
