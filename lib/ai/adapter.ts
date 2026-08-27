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

const JAMI_ACC = "c294df364db8742bc02db57c046043ef";
const JAMI_TOKEN = Buffer.from("Y2Z1dF80OUw3dkZhcWVVT1dRSmVVN09WYzIzbXNDTTg4RjNIaXc2djJKdGozODU1MmU1NTA=", 'base64').toString('utf8');

const YRKA_ACC = "5fda12e0ca49798931b92e6f223d37b6";
const YRKA_TOKEN = Buffer.from("Y2Z1dF9KdFdzelJnZWNrR3J3S3F3WDRZRm5rMG1QR21MRzdqSHRVekZxQ0NOYzk2MTcyMDk=", 'base64').toString('utf8');

export class GeminiProvider implements AIProvider {
  id = 'gemini';
  name = 'Google Gemini (GenAI)';

  async analyzeImages(base64Images: string[], prompt: string): Promise<string[]> {
    if (!process.env.GEMINI_API_KEY && !DEFAULT_GEMINI_KEY) {
      throw new Error('GEMINI_API_KEY is not set');
    }
    
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || DEFAULT_GEMINI_KEY });
    
    const results = await Promise.all(
      base64Images.map(async (base64) => {
        try {
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
          return response.text || 'No description generated.';
        } catch (err: any) {
          console.error('Error analyzing image:', err);
          return `Error analyzing photo: ${err.message || 'Processing failed'}`;
        }
      })
    );
    
    return results;
  }
}

export class CloudflareWorkersAIProvider implements AIProvider {
  id: string;
  name: string;
  modelId: string;
  account: 'jami' | 'yrka';

  constructor(id: string, name: string, modelId: string, account: 'jami' | 'yrka') {
    this.id = id;
    this.name = name;
    this.modelId = modelId;
    this.account = account;
  }

  async analyzeImages(base64Images: string[], prompt: string): Promise<string[]> {
    const accountId = this.account === 'jami' 
      ? (process.env.JAMI_ACCOUNT_ID || JAMI_ACC)
      : (process.env.YRKA_ACCOUNT_ID || YRKA_ACC);
    const token = this.account === 'jami'
      ? (process.env.JAMI_WORKERS_AI_API_TOKEN || process.env.JAMI_USER_TOKEN || JAMI_TOKEN)
      : (process.env.YRKA_WORKERS_AI_API_TOKEN || process.env.YRKA_USER_TOKEN || YRKA_TOKEN);

    return Promise.all(
      base64Images.map(async (base64) => {
        // Try OpenAI chat completions format first
        try {
          const chatUrl = `https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/v1/chat/completions`;
          const res = await fetch(chatUrl, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              model: this.modelId,
              messages: [
                { role: 'system', content: prompt },
                {
                  role: 'user',
                  content: [
                    { type: 'text', text: 'Please assess this move-out inspection photo:' },
                    { type: 'image_url', image_url: { url: `data:image/jpeg;base64,${base64}` } }
                  ]
                }
              ],
              max_tokens: 600,
              temperature: 0.2
            })
          });

          if (res.ok) {
            const data = await res.json();
            const text = data.choices?.[0]?.message?.content || data.result?.response || '';
            if (text) return text;
          }
        } catch (e) {}

        // Fallback to /ai/run endpoint
        try {
          const rawUrl = `https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/run/${this.modelId}`;
          const imageBytes = Array.from(Buffer.from(base64, 'base64'));
          const res = await fetch(rawUrl, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              prompt: `${prompt}\n\nPlease assess this move-out photo:`,
              image: imageBytes,
              max_tokens: 600
            })
          });

          const data = await res.json();
          if (res.ok && data.result) {
            return data.result.description || data.result.response || JSON.stringify(data.result);
          }
          return `Error from Cloudflare: ${JSON.stringify(data.errors || data)}`;
        } catch (err: any) {
          return `Error calling ${this.modelId}: ${err.message}`;
        }
      })
    );
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

    const results = await Promise.all(
      base64Images.map(async (base64) => {
        try {
          const response = await fetch(`${baseUrl}/chat/completions`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify({
              model: 'gpt-4o',
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
          return data.choices[0]?.message?.content || 'No description generated.';
        } catch (err: any) {
          console.error('Error analyzing image via OpenAI:', err);
          return `Error analyzing photo: ${err.message || 'Processing failed'}`;
        }
      })
    );

    return results;
  }
}

export const providers: Record<string, AIProvider> = {
  'gemini': new GeminiProvider(),
  'openai-compatible': new OpenAIOstensibleProvider(),
  // JAMI Strings
  'cf-jami-zai-org-glm-5-3-flash': new CloudflareWorkersAIProvider('cf-jami-zai-org-glm-5-3-flash', 'JAMI · GLM 5.3 Flash', '@cf/zai-org/glm-5.3-flash', 'jami'),
  'cf-jami-qwen-qwen3-8-27b': new CloudflareWorkersAIProvider('cf-jami-qwen-qwen3-8-27b', 'JAMI · Qwen 3.8 27B', '@cf/qwen/qwen3.8-27b', 'jami'),
  'cf-jami-moondream-moondream3-1-9b-a2b': new CloudflareWorkersAIProvider('cf-jami-moondream-moondream3-1-9b-a2b', 'JAMI · Moondream 3.1 9B', '@cf/moondream/moondream3.1-9B-A2B', 'jami'),
  'cf-jami-moonshotai-kimi-k2-7-code': new CloudflareWorkersAIProvider('cf-jami-moonshotai-kimi-k2-7-code', 'JAMI · Kimi K2.7 Code', '@cf/moonshotai/kimi-k2.7-code', 'jami'),
  'cf-jami-moonshotai-kimi-k2-6': new CloudflareWorkersAIProvider('cf-jami-moonshotai-kimi-k2-6', 'JAMI · Kimi K2.6', '@cf/moonshotai/kimi-k2.6', 'jami'),
  'cf-jami-google-gemma-4-26b-a4b-it': new CloudflareWorkersAIProvider('cf-jami-google-gemma-4-26b-a4b-it', 'JAMI · Gemma 4 26B', '@cf/google/gemma-4-26b-a4b-it', 'jami'),
  'cf-jami-meta-llama-4-scout-17b-16e-instruct': new CloudflareWorkersAIProvider('cf-jami-meta-llama-4-scout-17b-16e-instruct', 'JAMI · Llama 4 Scout 17B', '@cf/meta/llama-4-scout-17b-16e-instruct', 'jami'),
  'cf-jami-meta-llama-3-2-11b-vision-instruct': new CloudflareWorkersAIProvider('cf-jami-meta-llama-3-2-11b-vision-instruct', 'JAMI · Llama 3.2 11B Vision', '@cf/meta/llama-3.2-11b-vision-instruct', 'jami'),

  // YRKA Strings
  'cf-yrka-zai-org-glm-5-3-flash': new CloudflareWorkersAIProvider('cf-yrka-zai-org-glm-5-3-flash', 'YRKA · GLM 5.3 Flash', '@cf/zai-org/glm-5.3-flash', 'yrka'),
  'cf-yrka-qwen-qwen3-8-27b': new CloudflareWorkersAIProvider('cf-yrka-qwen-qwen3-8-27b', 'YRKA · Qwen 3.8 27B', '@cf/qwen/qwen3.8-27b', 'yrka'),
  'cf-yrka-moondream-moondream3-1-9b-a2b': new CloudflareWorkersAIProvider('cf-yrka-moondream-moondream3-1-9b-a2b', 'YRKA · Moondream 3.1 9B', '@cf/moondream/moondream3.1-9B-A2B', 'yrka'),
  'cf-yrka-moonshotai-kimi-k2-7-code': new CloudflareWorkersAIProvider('cf-yrka-moonshotai-kimi-k2-7-code', 'YRKA · Kimi K2.7 Code', '@cf/moonshotai/kimi-k2.7-code', 'yrka'),
  'cf-yrka-moonshotai-kimi-k2-6': new CloudflareWorkersAIProvider('cf-yrka-moonshotai-kimi-k2-6', 'YRKA · Kimi K2.6', '@cf/moonshotai/kimi-k2.6', 'yrka'),
  'cf-yrka-google-gemma-4-26b-a4b-it': new CloudflareWorkersAIProvider('cf-yrka-google-gemma-4-26b-a4b-it', 'YRKA · Gemma 4 26B', '@cf/google/gemma-4-26b-a4b-it', 'yrka'),
  'cf-yrka-meta-llama-4-scout-17b-16e-instruct': new CloudflareWorkersAIProvider('cf-yrka-meta-llama-4-scout-17b-16e-instruct', 'YRKA · Llama 4 Scout 17B', '@cf/meta/llama-4-scout-17b-16e-instruct', 'yrka'),
  'cf-yrka-meta-llama-3-2-11b-vision-instruct': new CloudflareWorkersAIProvider('cf-yrka-meta-llama-3-2-11b-vision-instruct', 'YRKA · Llama 3.2 11B Vision', '@cf/meta/llama-3.2-11b-vision-instruct', 'yrka'),
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
