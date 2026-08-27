import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { reports, reportImages } from '@/lib/db/schema';
import { getActiveProvider, getSystemPrompt } from '@/lib/ai/adapter';
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY || 're_mock');

export async function POST(req: Request) {
  try {
    const body = await req.json();
    
    // Resend Inbound Webhook Payload structure
    // body.From, body.Attachments
    const sender = body.from;
    const attachments = body.attachments || [];
    
    if (!sender) {
      return NextResponse.json({ error: 'No sender found' }, { status: 400 });
    }

    // Filter for image attachments
    const imageAttachments = attachments.filter((att: any) => 
      att.contentType?.startsWith('image/')
    );

    if (imageAttachments.length === 0) {
      // Send bounce email
      await resend.emails.send({
        from: 'Move-out Assistant <onboarding@resend.dev>',
        to: sender,
        subject: 'Re: Move-out Inspection - No Images Found',
        text: 'We received your email, but no valid images were found attached. Please attach images to generate a report.'
      });
      return NextResponse.json({ success: true, message: 'Bounced no images' });
    }

    const aiProvider = await getActiveProvider();
    const systemPrompt = await getSystemPrompt();
    
    const base64Images = imageAttachments.map((att: any) => {
       // Resend webhook provides content as a Buffer or base64 string
       // Assuming it's base64 in the webhook, or we might need to convert
       // According to Resend docs, attachments content is a Buffer array or base64. 
       // Often it's provided as base64 string or an object with data buffer.
       // Let's assume it provides content as base64 or can be extracted.
       let data = att.content;
       if (data.type === 'Buffer') {
           data = Buffer.from(data.data).toString('base64');
       } else if (typeof data === 'string' && !data.includes('base64')) {
           data = Buffer.from(data).toString('base64');
       }
       return data;
    });

    const descriptions = await aiProvider.analyzeImages(base64Images, systemPrompt);
    
    // Store
    const [report] = await db.insert(reports).values({
      status: 'completed',
      emailSentTo: sender
    }).returning();
    
    const imageRecords = base64Images.map((base64: string, index: number) => ({
      reportId: report.id,
      base64Data: base64,
      description: descriptions[index],
    }));
    
    await db.insert(reportImages).values(imageRecords);

    // Email back
    await resend.emails.send({
      from: 'Move-out Assistant <onboarding@resend.dev>',
      to: sender,
      subject: 'Move-out Inspection Report',
      html: `
        <h1>Property Move-out Inspection Report</h1>
        <p>Your emailed images have been processed:</p>
        ${descriptions.map((desc: string, i: number) => `
          <div style="margin-bottom: 20px; border: 1px solid #ddd; padding: 10px;">
            <p>${desc}</p>
          </div>
        `).join('')}
      `
    });

    return NextResponse.json({ success: true });
    
  } catch (error: any) {
    console.error('Error processing inbound email:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
