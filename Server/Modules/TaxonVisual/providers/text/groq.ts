import { throwIfProviderLimitError } from 'server/Modules/TaxonVisual/providerLimitError.js';
import type { TextChatOptions } from './types.js';

const GROQ_CHAT_URL = 'https://api.groq.com/openai/v1/chat/completions';
export const DEFAULT_GROQ_TEXT_MODEL = 'llama-3.3-70b-versatile';
const PROVIDER = 'groq';

export function resolveGroqTextModel(): string {
  return process.env.GROQ_TEXT_MODEL?.trim() || DEFAULT_GROQ_TEXT_MODEL;
}

interface GroqChatResponse {
  choices?: Array<{
    message?: { content?: string | null };
  }>;
  error?: { message?: string; code?: string; type?: string };
}

export function isGroqTextConfigured(): boolean {
  return Boolean(process.env.GROQ_API_KEY?.trim());
}

export async function chatGroq(options: TextChatOptions): Promise<string> {
  const apiKey = process.env.GROQ_API_KEY?.trim();
  if (!apiKey) {
    throw new Error('GROQ_API_KEY is not configured');
  }

  const model = resolveGroqTextModel();

  const response = await fetch(GROQ_CHAT_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      temperature: options.temperature ?? 0.4,
      max_tokens: options.maxTokens ?? 120,
      messages: [
        { role: 'system', content: options.system },
        { role: 'user', content: options.user },
      ],
    }),
  });

  const payload = (await response.json()) as GroqChatResponse;

  if (!response.ok) {
    const message = payload.error?.message
      ?? payload.error?.code
      ?? `Groq HTTP ${response.status}`;
    throwIfProviderLimitError(message, PROVIDER);
    throw new Error(message);
  }

  const text = payload.choices?.[0]?.message?.content?.trim();
  if (!text) {
    throw new Error('Groq returned no text');
  }

  return text.replace(/^["']|["']$/g, '');
}

export async function generateDescriptionGroq(prompt: string): Promise<string> {
  return chatGroq({
    system:
      'You write concise, accurate natural-history blurbs. Reply with the description only.',
    user: prompt,
    maxTokens: 120,
    temperature: 0.4,
  });
}
