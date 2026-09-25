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
import {
  generateImageSelfHosted,
  isSelfHostedImageConfigured,
  isSelfHostedImageFirst,
  selfHostedImageTimeoutMs,
} from './self-hosted.js';

export type BuildImageProviderOptions = {
  openaiOnly?: boolean;
  specimen?: ResolvedSpecimen | null;
};

/**
 * Quality-first image pipeline; Google last (paid):
 * OpenAI → self-hosted (ImageServer/) → Cloudflare Flux → Pollinations Flux →
 * Gemini image model(s). IMAGE_SERVER_FIRST=true moves self-hosted ahead of
 * OpenAI.
 */
export function buildImageProviders(
  prompt: string,
  options: BuildImageProviderOptions = {},
): ProviderAttempt<GeneratedImage>[] {
  const specimen = options.specimen ?? null;
  const openai: ProviderAttempt<GeneratedImage> = {
    name: 'openai:gpt-image-1',
    isConfigured: isOpenAiImageConfigured,
    run: async () => ({
      buffer: await generateImageOpenAi(prompt),
      generator: 'openai:gpt-image-1',
    }),
  };
  const selfHosted: ProviderAttempt<GeneratedImage> = {
    name: 'self-hosted',
    isConfigured: isSelfHostedImageConfigured,
    timeoutMs: selfHostedImageTimeoutMs(),
    run: async () => {
      const { buffer, model } = await generateImageSelfHosted(prompt);
      return { buffer, generator: `self-hosted:${model}` };
    },
  };
  const providers: ProviderAttempt<GeneratedImage>[] = [
    ...(isSelfHostedImageFirst() ? [selfHosted, openai] : [openai, selfHosted]),
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
