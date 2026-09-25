import type { ProviderAttempt } from 'server/Modules/TaxonVisual/providers/failover.js';
import {
  applySelfHostedOnly,
  SELF_HOSTED,
} from 'server/Modules/TaxonVisual/providers/self-hosted.js';
import type { TextChatOptions } from './types.js';
import {
  chatGemini,
  generateDescriptionGemini,
  isGeminiTextConfigured,
  resolveGeminiTextModels,
} from './gemini.js';
import {
  chatGroq,
  generateDescriptionGroq,
  isGroqTextConfigured,
  resolveGroqTextModel,
} from './groq.js';
import {
  chatOpenAi,
  generateDescriptionOpenAi,
  isOpenAiTextConfigured,
} from './openai.js';
import {
  chatSelfHosted,
  generateDescriptionSelfHosted,
  isSelfHostedTextConfigured,
  selfHostedTextTimeoutMs,
} from './self-hosted.js';

/**
 * Text pipeline. Our own language server first, when it is configured, then
 * the external ones quality-first with Google models last (each with own
 * quota): self-hosted → OpenAI → Groq → Gemini Flash → Flash Lite → 3.1 Flash Lite
 */
export function buildTextProviders(prompt: string): ProviderAttempt<string>[] {
  const groqModel = resolveGroqTextModel();
  return applySelfHostedOnly([
    {
      name: SELF_HOSTED,
      isConfigured: isSelfHostedTextConfigured,
      timeoutMs: selfHostedTextTimeoutMs(),
      run: () => generateDescriptionSelfHosted(prompt),
    },
    {
      name: 'openai:gpt-4o-mini',
      isConfigured: isOpenAiTextConfigured,
      run: () => generateDescriptionOpenAi(prompt),
    },
    {
      name: `groq:${groqModel}`,
      isConfigured: isGroqTextConfigured,
      run: () => generateDescriptionGroq(prompt),
    },
    ...resolveGeminiTextModels().map((model) => ({
      name: `gemini:${model}`,
      isConfigured: isGeminiTextConfigured,
      run: () => generateDescriptionGemini(prompt, model),
    })),
  ]);
}

/** Same chain for arbitrary system/user chat (specimen resolve, etc.). */
export function buildTextChatProviders(
  options: TextChatOptions,
): ProviderAttempt<string>[] {
  const groqModel = resolveGroqTextModel();
  return applySelfHostedOnly([
    {
      name: SELF_HOSTED,
      isConfigured: isSelfHostedTextConfigured,
      timeoutMs: selfHostedTextTimeoutMs(),
      run: () => chatSelfHosted(options),
    },
    {
      name: 'openai:gpt-4o-mini',
      isConfigured: isOpenAiTextConfigured,
      run: () => chatOpenAi(options),
    },
    {
      name: `groq:${groqModel}`,
      isConfigured: isGroqTextConfigured,
      run: () => chatGroq(options),
    },
    ...resolveGeminiTextModels().map((model) => ({
      name: `gemini:${model}`,
      isConfigured: isGeminiTextConfigured,
      run: () => chatGemini({ ...options, model }),
    })),
  ]);
}
