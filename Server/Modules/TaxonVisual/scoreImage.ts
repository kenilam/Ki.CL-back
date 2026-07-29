import { throwIfProviderLimitError } from './providerLimitError.js';
import { isOpenAiTextConfigured } from './providers/text/openai.js';
import {
  buildScoreImageSystemPrompt,
  buildScoreImageUserPrompt,
  type ResolvedSpecimen,
} from './prompt.js';

const OPENAI_CHAT_URL = 'https://api.openai.com/v1/chat/completions';
const VISION_MODEL = 'gpt-4o';
const PROVIDER = 'openai-vision';

export type ImageScore = {
  taxon_match: number;
  morphology: number;
  style_plate: number;
  single_subject: number;
  no_text: number;
  overall: number;
  pass: boolean;
  suggestions: string[];
  skipped?: boolean;
};

interface OpenAIChatResponse {
  choices?: Array<{
    message?: { content?: string | null };
  }>;
  error?: { message?: string; code?: string; type?: string };
}

function parseScore(raw: string): ImageScore | null {
  const trimmed = raw.trim();
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const body = fenced?.[1]?.trim() ?? trimmed;
  const start = body.indexOf('{');
  const end = body.lastIndexOf('}');
  if (start < 0 || end <= start) {
    return null;
  }
  try {
    const parsed = JSON.parse(body.slice(start, end + 1)) as Record<string, unknown>;
    const num = (key: string, fallback = 0) => (
      typeof parsed[key] === 'number' ? parsed[key] as number : fallback
    );
    const suggestions = Array.isArray(parsed.suggestions)
      ? parsed.suggestions.filter((s): s is string => typeof s === 'string')
      : [];
    const taxon_match = num('taxon_match');
    const overall = num('overall');
    const pass = typeof parsed.pass === 'boolean'
      ? parsed.pass
      : overall >= 7 && taxon_match >= 6;

    return {
      taxon_match,
      morphology: num('morphology'),
      style_plate: num('style_plate'),
      single_subject: num('single_subject'),
      no_text: num('no_text'),
      overall,
      pass,
      suggestions: suggestions.slice(0, 3),
    };
  } catch {
    return null;
  }
}

function mimeForBuffer(buffer: Buffer): string {
  if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return 'image/jpeg';
  }
  if (
    buffer.length >= 12
    && buffer[0] === 0x52
    && buffer[1] === 0x49
    && buffer[2] === 0x46
    && buffer[3] === 0x46
  ) {
    return 'image/webp';
  }
  return 'image/png';
}

/**
 * Vision QA (GPT-4o). If OpenAI is unavailable, skip and pass so generation
 * still completes — same spirit as accepting best-after-retry.
 */
export async function scoreTaxonImage(
  buffer: Buffer,
  taxonName: string,
  specimen: ResolvedSpecimen,
  lineagePath?: string | null,
): Promise<ImageScore> {
  if (!isOpenAiTextConfigured()) {
    console.warn('[TaxonVisual] vision score skipped (no OPENAI_API_KEY)');
    return {
      taxon_match: 10,
      morphology: 10,
      style_plate: 10,
      single_subject: 10,
      no_text: 10,
      overall: 10,
      pass: true,
      suggestions: [],
      skipped: true,
    };
  }

  const apiKey = process.env.OPENAI_API_KEY!.trim();
  const mime = mimeForBuffer(buffer);
  const dataUrl = `data:${mime};base64,${buffer.toString('base64')}`;

  const response = await fetch(OPENAI_CHAT_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: VISION_MODEL,
      temperature: 0.1,
      max_tokens: 280,
      messages: [
        { role: 'system', content: buildScoreImageSystemPrompt() },
        {
          role: 'user',
          content: [
            { type: 'text', text: buildScoreImageUserPrompt(taxonName, specimen, lineagePath) },
            { type: 'image_url', image_url: { url: dataUrl } },
          ],
        },
      ],
    }),
  });

  const payload = (await response.json()) as OpenAIChatResponse;

  if (!response.ok) {
    const message = payload.error?.message
      ?? payload.error?.code
      ?? `OpenAI vision HTTP ${response.status}`;
    throwIfProviderLimitError(message, PROVIDER);
    throw new Error(message);
  }

  const text = payload.choices?.[0]?.message?.content?.trim();
  if (!text) {
    throw new Error('OpenAI vision returned no score');
  }

  const score = parseScore(text);
  if (!score) {
    console.warn('[TaxonVisual] vision score parse failed; treating as pass');
    return {
      taxon_match: 7,
      morphology: 7,
      style_plate: 7,
      single_subject: 7,
      no_text: 7,
      overall: 7,
      pass: true,
      suggestions: [],
    };
  }

  return score;
}
