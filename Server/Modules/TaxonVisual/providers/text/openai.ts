import { throwIfProviderLimitError } from 'server/Modules/TaxonVisual/providerLimitError.js';
import type { TextChatOptions } from './types.js';

const OPENAI_CHAT_URL = 'https://api.openai.com/v1/chat/completions';
const DEFAULT_MODEL = 'gpt-4o-mini';
const PROVIDER = 'openai';

interface OpenAIChatResponse {
  choices?: Array<{
    message?: { content?: string | null };
  }>;
  error?: { message?: string; code?: string; type?: string };
}

export function isOpenAiTextConfigured(): boolean {
  return Boolean(process.env.OPENAI_API_KEY?.trim());
}

export async function chatOpenAi(
  options: TextChatOptions & { model?: string },
): Promise<string> {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY is not configured');
  }

  const response = await fetch(OPENAI_CHAT_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: options.model ?? DEFAULT_MODEL,
      temperature: options.temperature ?? 0.4,
      max_tokens: options.maxTokens ?? 120,
      messages: [
        { role: 'system', content: options.system },
        { role: 'user', content: options.user },
      ],
    }),
  });

  const payload = (await response.json()) as OpenAIChatResponse;

  if (!response.ok) {
    const message = payload.error?.message
      ?? payload.error?.code
      ?? `OpenAI HTTP ${response.status}`;
    throwIfProviderLimitError(message, PROVIDER);
    throw new Error(message);
  }

  const text = payload.choices?.[0]?.message?.content?.trim();
  if (!text) {
    throw new Error('OpenAI returned no text');
  }

  return text.replace(/^["']|["']$/g, '');
}

export async function generateDescriptionOpenAi(prompt: string): Promise<string> {
  return chatOpenAi({
    system:
      'You write concise, accurate natural-history blurbs. Reply with the description only.',
    user: prompt,
    maxTokens: 120,
    temperature: 0.4,
  });
}
