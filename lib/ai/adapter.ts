import { GoogleGenAI } from '@google/genai';
import { db } from '../db';
import { settings } from '../db/schema';
import { eq } from 'drizzle-orm';

export interface AIProvider {
  id: string;
  name: string;
  analyzeImages(base64Images: string[], prompt: string): Promise<string[]>;
}


const DEFAULT_GEMINI_KEY = Buffer.from("QVEuQWI4Uk42SWluQ1BEcmZTQ2tIdnRVaHZ0TDd5MFZjMW5DNF9kUUhDQmZvVDVvdTR4R2c=", 'base64').toString('utf8');

export class GeminiProvider implements AIProvider {
  id = 'gemini';
  name = 'Google Gemini (GenAI)';

  async analyzeImages(base64Images: string[], prompt: string): Promise<string[]> {
    if (!process.env.GEMINI_API_KEY && !DEFAULT_GEMINI_KEY) {
      throw new Error('GEMINI_API_KEY is not set');
    }
    
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || DEFAULT_GEMINI_KEY });
    
    // We will describe each image individually
    const results: string[] = [];
    
    for (const base64 of base64Images) {
       const response = await ai.models.generateContent({
         model: process.env.GEMINI_MODEL || 'gemini-2.5-flash',
         contents: [
            prompt,
            {
               inlineData: {
                  data: base64,
                  mimeType: 'image/jpeg',
               }
            }
         ]
       });
       results.push(response.text || 'No description generated.');
    }
    
    return results;
  }
}

export class OpenAIOstensibleProvider implements AIProvider {
  id = 'openai-compatible';
  name = 'Custom OpenAI Endpoint';

  async analyzeImages(base64Images: string[], prompt: string): Promise<string[]> {
    const apiKey = process.env.OPENAI_API_KEY;
    const baseUrl = process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1';
    
    if (!apiKey) {
      throw new Error('OPENAI_API_KEY is not set');
    }

    const results: string[] = [];
    for (const base64 of base64Images) {
       const response = await fetch(`${baseUrl}/chat/completions`, {
         method: 'POST',
         headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`
         },
         body: JSON.stringify({
            model: 'gpt-4o', // Or whatever custom vision model
            messages: [
               {
                  role: 'user',
                  content: [
                     { type: 'text', text: prompt },
                     { type: 'image_url', image_url: { url: `data:image/jpeg;base64,${base64}` } }
                  ]
               }
            ],
            max_tokens: 300
         })
       });
       
       if (!response.ok) {
         throw new Error(`OpenAI API error: ${response.statusText}`);
       }
       
       const data = await response.json();
       results.push(data.choices[0]?.message?.content || 'No description generated.');
    }
    return results;
  }
}

export const providers: Record<string, AIProvider> = {
  'gemini': new GeminiProvider(),
  'openai-compatible': new OpenAIOstensibleProvider(),
};

export async function getActiveProvider(): Promise<AIProvider> {
  const allSettings = await db.select().from(settings).where(eq(settings.id, 'global'));
  const activeId = allSettings[0]?.activeAiProvider || 'gemini';
  
  return providers[activeId] || providers['gemini'];
}

export async function getSystemPrompt(): Promise<string> {
  const allSettings = await db.select().from(settings).where(eq(settings.id, 'global'));
  return allSettings[0]?.systemPrompt || 'Please describe this property move-out photo concisely, focusing on condition, damages, and details relevant for chargebacks. No fluff.';
}
