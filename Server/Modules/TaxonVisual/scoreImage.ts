import { runProviderFailover } from './providers/failover.js';
import { buildVisionProviders } from './providers/vision/index.js';
import {
  buildScoreImageSystemPrompt,
  buildScoreImageUserPrompt,
  type ResolvedSpecimen,
} from './prompt.js';

export type ImageScore = {
  taxon_match: number;
  morphology: number;
  /**
   * Anatomical plausibility, scored apart from whether the organism is right.
   *
   * `morphology` only asks whether the subject matches its lock — a human plate
   * is bipedal and upright whether or not the head sits at a possible angle to
   * the neck. So the rubric had no way to say "this is the right creature,
   * drawn broken", and the distortions that make a plate unsettling went
   * unmeasured while it scored a comfortable pass.
   */
  anatomy: number;
  style_plate: number;
  single_subject: number;
  no_text: number;
  overall: number;
  pass: boolean;
  suggestions: string[];
  /**
   * Whether a model actually looked at the image.
   *
   * The one field that must never be inferred. Everything above it is a
   * judgement; this says whether there was a judgement at all, and it is what
   * keeps an unreviewed plate from being stored as a reviewed one.
   */
  scored: boolean;
};

/**
 * The stand-in used when no provider could look at the image.
 *
 * It passes, because a review that did not happen is not grounds for throwing
 * away a render — but it is marked `scored: false`, and nothing marked that way
 * is persisted as a score.
 */
const UNSCORED: ImageScore = {
  taxon_match: 0,
  morphology: 0,
  anatomy: 0,
  style_plate: 0,
  single_subject: 0,
  no_text: 0,
  overall: 0,
  pass: true,
  suggestions: [],
  scored: false,
};

export function unscored(): ImageScore {
  return { ...UNSCORED };
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
    // Absent on a reply from before the criterion existed; treat as unjudged
    // rather than as a zero that would fail every such image.
    const anatomy = num('anatomy', 10);
    const pass = typeof parsed.pass === 'boolean'
      ? parsed.pass
      : overall >= 7 && taxon_match >= 6 && anatomy >= 6;

    return {
      taxon_match,
      morphology: num('morphology'),
      anatomy,
      style_plate: num('style_plate'),
      single_subject: num('single_subject'),
      no_text: num('no_text'),
      overall,
      pass,
      suggestions: suggestions.slice(0, 3),
      scored: true,
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
 * Vision QA across the provider chain.
 *
 * Throws when no provider could produce a usable score, rather than returning
 * an invented one. The caller decides what to do with a render that could not
 * be reviewed — it is not this function's place to call it a pass.
 */
export async function scoreTaxonImage(
  buffer: Buffer,
  taxonName: string,
  specimen: ResolvedSpecimen,
  lineagePath?: string | null,
): Promise<ImageScore> {
  const text = await runProviderFailover(
    buildVisionProviders({
      system: buildScoreImageSystemPrompt(),
      user: buildScoreImageUserPrompt(taxonName, specimen, lineagePath),
      image: buffer,
      mime: mimeForBuffer(buffer),
      /*
       * The reply itself is ~100 tokens, but reasoning is spent from the same
       * budget and runs first — measured at ~450 tokens before a single
       * character of JSON. The old ceiling of 280 was therefore consumed
       * before the answer started, and the half-written object that came back
       * did not parse, which used to be converted into a passing score.
       */
      maxTokens: 2048,
      temperature: 0.1,
    }),
    'vision',
  );

  const score = parseScore(text);

  if (!score) {
    throw new Error(
      `Vision score could not be parsed: ${text.slice(0, 200)}`,
    );
  }

  return score;
}
