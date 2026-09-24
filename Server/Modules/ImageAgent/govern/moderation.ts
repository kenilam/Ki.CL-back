import { throwIfProviderLimitError } from 'server/Modules/TaxonVisual/providerLimitError.js';
import { ImageAgentRejection } from 'server/Types/graphql.js';

const OPENAI_MODERATION_URL = 'https://api.openai.com/v1/moderations';
const MODEL = 'omni-moderation-latest';
const PROVIDER = 'openai:moderation';

export type ModerationVerdict = {
  flagged: boolean;
  rejection: ImageAgentRejection | null;
  /** The category that tripped, e.g. `sexual/minors`, for the log. */
  category: string | null;
};

interface OpenAIModerationResponse {
  results?: Array<{
    flagged?: boolean;
    categories?: Record<string, boolean>;
    category_scores?: Record<string, number>;
  }>;
  error?: { message?: string; code?: string; type?: string };
}

/*
 * Category → rejection. Checked in this order so the most specific reason
 * wins when several trip at once.
 */
const CATEGORY_REJECTION: Array<[RegExp, ImageAgentRejection]> = [
  [/^sexual/, ImageAgentRejection.UnsafeSexual],
  [/^violence/, ImageAgentRejection.UnsafeViolent],
  [/^self-harm/, ImageAgentRejection.UnsafeViolent],
  [/^(harassment|hate|illicit)/, ImageAgentRejection.UnsafeOther],
];

export function isModerationConfigured(): boolean {
  return Boolean(process.env.OPENAI_API_KEY?.trim());
}

/**
 * OpenAI's moderation endpoint. Free of charge, built for exactly this, and
 * reads the sentence rather than matching words - so it is the main safety
 * check, with the local word list in front of it only to save the call on the
 * obvious cases.
 *
 * Returns null when it is not configured. The caller decides what that means.
 */
export async function moderatePrompt(prompt: string): Promise<ModerationVerdict | null> {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) {
    return null;
  }

  const response = await fetch(OPENAI_MODERATION_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ model: MODEL, input: prompt }),
  });

  const payload = (await response.json()) as OpenAIModerationResponse;

  if (!response.ok) {
    const message = payload.error?.message
      ?? payload.error?.code
      ?? `OpenAI moderation HTTP ${response.status}`;
    throwIfProviderLimitError(message, PROVIDER);
    throw new Error(message);
  }

  const result = payload.results?.[0];
  if (!result) {
    throw new Error('OpenAI moderation returned no result');
  }

  const tripped = Object.entries(result.categories ?? {})
    .filter(([, on]) => on)
    .map(([category]) => category);

  if (!result.flagged || tripped.length === 0) {
    return { flagged: false, rejection: null, category: null };
  }

  for (const [pattern, rejection] of CATEGORY_REJECTION) {
    const category = tripped.find((name) => pattern.test(name));
    if (category) {
      return { flagged: true, rejection, category };
    }
  }

  return {
    flagged: true,
    rejection: ImageAgentRejection.UnsafeOther,
    category: tripped[0] ?? null,
  };
}

export function reasonForModeration(verdict: ModerationVerdict): string {
  switch (verdict.rejection) {
    case ImageAgentRejection.UnsafeSexual:
      return 'Sexual content is not something this agent draws.';
    case ImageAgentRejection.UnsafeViolent:
      return 'Graphic violence and harm are not something this agent draws.';
    default:
      return 'That request is outside what this agent will draw.';
  }
}
