import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { db } from '@/lib/db';
import { reports, reportImages, settings } from '@/lib/db/schema';
import { getActiveProvider, getSystemPrompt } from '@/lib/ai/adapter';
import { Resend } from 'resend';
import { eq } from 'drizzle-orm';

const resend = new Resend(process.env.RESEND_API_KEY || 're_mock');

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { images } = await req.json();
    
    if (!images || !Array.isArray(images) || images.length === 0) {
      return NextResponse.json({ error: 'No images provided' }, { status: 400 });
    }
    
    const aiProvider = await getActiveProvider();
    const systemPrompt = await getSystemPrompt();
    
    // Process images
    const descriptions = await aiProvider.analyzeImages(images, systemPrompt);
    
    // Store in database
    const [report] = await db.insert(reports).values({
      status: 'completed',
      emailSentTo: session.user.email
    }).returning();
    
    const imageRecords = images.map((base64, index) => ({
      reportId: report.id,
      base64Data: base64,
      description: descriptions[index],
    }));
    
    await db.insert(reportImages).values(imageRecords);
    
    // Send Email
    if (session.user.email) {
      await resend.emails.send({
        from: process.env.RESEND_FROM || 'Sidekick <reports@mail.navinhill.com>',
        to: session.user.email,
        subject: 'Move-out Inspection Report',
        html: `
          <h1>Property Move-out Inspection Report</h1>
          <p>Please find the inspection results below:</p>
          ${descriptions.map((desc, i) => `
            <div style="margin-bottom: 20px; border: 1px solid #ddd; padding: 10px;">
              <p>${desc}</p>
              <img src="data:image/jpeg;base64,${images[i]}" alt="Inspection Photo ${i + 1}" style="max-width: 400px; max-height: 400px;" />
            </div>
          `).join('')}
        `
      });
    }

    return NextResponse.json({ 
      success: true, 
      reportId: report.id,
      results: descriptions.map((desc, i) => ({
        base64Data: images[i],
        description: desc
      }))
    });
    
  } catch (error: any) {
    console.error('Error processing upload:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
