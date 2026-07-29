import { throwIfProviderLimitError } from 'server/Modules/TaxonVisual/providerLimitError.js';

const OPENAI_IMAGES_URL = 'https://api.openai.com/v1/images/generations';
const MODEL = 'gpt-image-1';
const SIZE = '1024x1024';
const QUALITY = 'medium';
const PROVIDER = 'openai';

interface OpenAIImageResponse {
  data?: Array<{
    b64_json?: string;
    url?: string;
  }>;
  error?: { message?: string; code?: string; type?: string };
}

async function bufferFromOpenAiImage(
  image: NonNullable<OpenAIImageResponse['data']>[number],
): Promise<Buffer> {
  if (image.b64_json) {
    return Buffer.from(image.b64_json, 'base64');
  }

  if (image.url) {
    const imageResponse = await fetch(image.url);
    if (!imageResponse.ok) {
      throw new Error(`Failed to download image (${imageResponse.status})`);
    }
    return Buffer.from(await imageResponse.arrayBuffer());
  }

  throw new Error('OpenAI image missing b64_json and url');
}

export function isOpenAiImageConfigured(): boolean {
  return Boolean(process.env.OPENAI_API_KEY?.trim());
}

export async function generateImageOpenAi(prompt: string): Promise<Buffer> {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY is not configured');
  }

  const response = await fetch(OPENAI_IMAGES_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: MODEL,
      prompt,
      size: SIZE,
      quality: QUALITY,
      n: 1,
    }),
  });

  const payload = (await response.json()) as OpenAIImageResponse;

  if (!response.ok) {
    const message = payload.error?.message
      ?? payload.error?.code
      ?? `OpenAI HTTP ${response.status}`;
    throwIfProviderLimitError(message, PROVIDER);
    if (message.toLowerCase().includes('content_policy')) {
      throw new Error(`Content policy rejection: ${message}`);
    }
    throw new Error(message);
  }

  const image = payload.data?.[0];
  if (!image) {
    throw new Error('OpenAI returned no image data');
  }

  return bufferFromOpenAiImage(image);
}
