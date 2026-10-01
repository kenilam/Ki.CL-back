import { throwIfProviderLimitError } from 'server/Modules/TaxonVisual/providerLimitError.js';
import {
  normaliseServerUrl,
  SELF_HOSTED,
  selfHostedBearer,
  timeoutMsFrom,
} from 'server/Modules/TaxonVisual/providers/self-hosted.js';
import type { TextChatOptions } from './types.js';

/** What LanguageServer/ serves by default; vLLM wants it named in the request. */
const DEFAULT_MODEL = 'Qwen/Qwen3-VL-8B-Instruct';

export function languageServerUrl(): string | null {
  return normaliseServerUrl(process.env.LLM_SERVER_URL);
}

export function resolveLanguageServerModel(): string {
  return process.env.LLM_SERVER_MODEL?.trim() || DEFAULT_MODEL;
}

export function isSelfHostedTextConfigured(): boolean {
  return languageServerUrl() != null;
}

export function selfHostedTextTimeoutMs(): number {
  return timeoutMsFrom(process.env.LLM_SERVER_TIMEOUT_MS);
}

/** One OpenAI-style message. Vision passes an array of parts as `content`. */
export type ChatMessage = {
  role: 'system' | 'user';
  content: string | Array<
    | { type: 'text'; text: string }
    | { type: 'image_url'; image_url: { url: string } }
  >;
};

interface ChatCompletionResponse {
  choices?: Array<{
    message?: { content?: string | null };
  }>;
  error?: { message?: string; code?: string; type?: string } | string;
}

/**
 * POST /v1/chat/completions on LanguageServer/. Text and vision share this,
 * since vLLM takes both through the same route.
 */
export async function chatCompletionSelfHosted(
  messages: ChatMessage[],
  options: { maxTokens: number; temperature: number },
): Promise<string> {
  const url = languageServerUrl();
  if (!url) {
    throw new Error('LLM_SERVER_URL is not configured');
  }

  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  const bearer = await selfHostedBearer(url, process.env.LLM_SERVER_TOKEN);
  if (bearer) {
    headers.Authorization = bearer;
  }

  const response = await fetch(`${url}/v1/chat/completions`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      model: resolveLanguageServerModel(),
      temperature: options.temperature,
      max_tokens: options.maxTokens,
      messages,
    }),
  });

  const payload = (await response.json()) as ChatCompletionResponse;

  if (!response.ok) {
    const error = payload.error;
    const message = (typeof error === 'string' ? error : error?.message ?? error?.code)
      ?? `Language server HTTP ${response.status}`;
    if (response.status === 429 || response.status === 503) {
      throwIfProviderLimitError(`rate limit: ${message}`, SELF_HOSTED);
    }
    throwIfProviderLimitError(message, SELF_HOSTED);
    throw new Error(message);
  }

  const text = payload.choices?.[0]?.message?.content?.trim();
  if (!text) {
    throw new Error('Language server returned no text');
  }

  return text;
}

export async function chatSelfHosted(options: TextChatOptions): Promise<string> {
  const text = await chatCompletionSelfHosted(
    [
      { role: 'system', content: options.system },
      { role: 'user', content: options.user },
    ],
    { maxTokens: options.maxTokens ?? 120, temperature: options.temperature ?? 0.4 },
  );
  return text.replace(/^["']|["']$/g, '');
}

export async function generateDescriptionSelfHosted(prompt: string): Promise<string> {
  return chatSelfHosted({
    system:
      'You write concise, accurate natural-history blurbs. Reply with the description only.',
    user: prompt,
    maxTokens: 120,
    temperature: 0.4,
  });
}
