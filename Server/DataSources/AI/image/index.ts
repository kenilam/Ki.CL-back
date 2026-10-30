import type { ProviderAttempt } from 'server/DataSources/AI/failover.js';
import type { GeneratedImage } from './types.js';
import {
  generateImageCloudflare,
  isCloudflareImageConfigured,
} from './cloudflare.js';
import {
  generateImageGemini,
  isGeminiImageConfigured,
  resolveGeminiImageModels,
} from './gemini.js';
import {
  generateImageOpenAi,
  isOpenAiImageConfigured,
} from './openai.js';
import {
  generateImagePollinations,
  isPollinationsImageConfigured,
} from './pollinations.js';

export type BuildImageProviderOptions = {
  openaiOnly?: boolean;
  fluxPrompt?: string;
};

/**
 * Quality-first image pipeline; Google last (paid):
 * OpenAI → Cloudflare Flux → Pollinations Flux → Gemini image model(s)
 */
export function buildImageProviders(
  prompt: string,
  options: BuildImageProviderOptions = {},
): ProviderAttempt<GeneratedImage>[] {
  const fluxPrompt = options.fluxPrompt ?? prompt;
  const providers: ProviderAttempt<GeneratedImage>[] = [
    {
      name: 'openai:gpt-image-1',
      isConfigured: isOpenAiImageConfigured,
      run: async () => ({
        buffer: await generateImageOpenAi(prompt),
        generator: 'openai:gpt-image-1',
      }),
    },
    {
      name: 'cloudflare:flux-1-schnell',
      isConfigured: isCloudflareImageConfigured,
      run: async () => ({
        buffer: await generateImageCloudflare(fluxPrompt),
        generator: 'cloudflare:flux-1-schnell',
      }),
    },
    {
      name: 'pollinations:flux',
      isConfigured: isPollinationsImageConfigured,
      run: async () => ({
        buffer: await generateImagePollinations(fluxPrompt),
        generator: 'pollinations:flux',
      }),
    },
    ...resolveGeminiImageModels().map((model) => ({
      name: `gemini:${model}`,
      isConfigured: isGeminiImageConfigured,
      run: async () => ({
        buffer: await generateImageGemini(prompt, model),
        generator: `gemini:${model}`,
      }),
    })),
  ];

  if (options.openaiOnly) {
    return providers.filter((provider) => provider.name.startsWith('openai:'));
  }

  return providers;
}
