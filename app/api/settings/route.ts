import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { db } from '@/lib/db';
import { settings } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const allSettings = await db.select().from(settings).where(eq(settings.id, 'global'));
  
  if (allSettings.length === 0) {
    const [newSettings] = await db.insert(settings).values({ id: 'global' }).returning();
    return NextResponse.json(newSettings);
  }
  
  return NextResponse.json(allSettings[0]);
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { systemPrompt, activeAiProvider } = await req.json();
  
  const allSettings = await db.select().from(settings).where(eq(settings.id, 'global'));
  
  if (allSettings.length === 0) {
    const [newSettings] = await db.insert(settings).values({
      id: 'global',
      systemPrompt,
      activeAiProvider,
    }).returning();
    return NextResponse.json(newSettings);
  } else {
    const [updatedSettings] = await db.update(settings)
      .set({ systemPrompt, activeAiProvider, updatedAt: new Date() })
      .where(eq(settings.id, 'global'))
      .returning();
    return NextResponse.json(updatedSettings);
  }
}
