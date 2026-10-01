import type { ProviderAttempt } from 'server/Modules/TaxonVisual/providers/failover.js';
import {
  applySelfHostedOnly,
  isSelfHostedOnly,
  SELF_HOSTED,
} from 'server/Modules/TaxonVisual/providers/self-hosted.js';
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
  selfHostedImageTimeoutMs,
} from './self-hosted.js';

export type BuildImageProviderOptions = {
  openaiOnly?: boolean;
  specimen?: ResolvedSpecimen | null;
};

/**
 * Image pipeline. Our own image server first, when it is configured, then the
 * external ones quality-first with Google last (paid):
 * self-hosted (ImageServer/) → OpenAI → Cloudflare Flux → Pollinations Flux →
 * Gemini image model(s)
 */
export function buildImageProviders(
  prompt: string,
  options: BuildImageProviderOptions = {},
): ProviderAttempt<GeneratedImage>[] {
  const specimen = options.specimen ?? null;
  const providers: ProviderAttempt<GeneratedImage>[] = [
    {
      name: SELF_HOSTED,
      isConfigured: isSelfHostedImageConfigured,
      timeoutMs: selfHostedImageTimeoutMs(),
      run: async () => {
        const { buffer, model } = await generateImageSelfHosted(prompt);
        return { buffer, generator: `${SELF_HOSTED}:${model}` };
      },
    },
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

  // An OpenAI-only request still stays home when nothing may leave.
  if (options.openaiOnly && !isSelfHostedOnly()) {
    return providers.filter((provider) => provider.name.startsWith('openai:'));
  }

  return applySelfHostedOnly(providers);
}
