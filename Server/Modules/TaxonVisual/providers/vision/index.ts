import type { ProviderAttempt } from 'server/Modules/TaxonVisual/providers/failover.js';
import type { VisionChatOptions } from './types.js';
import {
  chatGeminiVision,
  isGeminiVisionConfigured,
  resolveGeminiVisionModels,
} from './gemini.js';
import {
  chatOpenAiVision,
  isOpenAiVisionConfigured,
  resolveOpenAiVisionModel,
} from './openai.js';

/**
 * Vision QA pipeline: OpenAI → Gemini.
 *
 * Scoring used to be a single call to OpenAI with no fallback, while text and
 * images each had three providers. When that one account ran out of credit the
 * scorer failed on every image and the pipeline waved each one through - so
 * every stored score was a fabricated pass. A chain is what makes the review
 * survive one provider going dark.
 *
 * Groq is absent deliberately: its catalogue on this account is text and audio
 * only, so there is no model here for it to answer with.
 */
export function buildVisionProviders(
  options: VisionChatOptions,
): ProviderAttempt<string>[] {
  return [
    {
      name: `openai:${resolveOpenAiVisionModel()}`,
      isConfigured: isOpenAiVisionConfigured,
      run: () => chatOpenAiVision(options),
    },
    ...resolveGeminiVisionModels().map((model) => ({
      name: `gemini:${model}`,
      isConfigured: isGeminiVisionConfigured,
      run: () => chatGeminiVision({ ...options, model }),
    })),
  ];
}

export type { VisionChatOptions } from './types.js';
