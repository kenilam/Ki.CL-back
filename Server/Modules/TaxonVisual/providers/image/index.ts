import type { ProviderAttempt } from 'server/Modules/TaxonVisual/providers/failover.js';
import type { ResolvedSpecimen } from 'server/Modules/TaxonVisual/prompt.js';
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
  specimen?: ResolvedSpecimen | null;
};

/**
 * Quality-first image pipeline; Google last (paid):
 * OpenAI → Cloudflare Flux → Pollinations Flux → Gemini image model(s)
 */
export function buildImageProviders(
  prompt: string,
  options: BuildImageProviderOptions = {},
): ProviderAttempt<GeneratedImage>[] {
  const specimen = options.specimen ?? null;
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
        buffer: await generateImageCloudflare(prompt, specimen),
        generator: 'cloudflare:flux-1-schnell',
      }),
    },
    {
      name: 'pollinations:flux',
      isConfigured: isPollinationsImageConfigured,
      run: async () => ({
        buffer: await generateImagePollinations(prompt, specimen),
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
