import type { ImageAgentJobScore } from 'server/DataSources/MongoDB/ImageAgentJobs/Model.js';
import { parseModelJson } from 'server/Helpers/parseModelJson.js';
import { imageContentType } from 'server/Helpers/imageFormat.js';
import { runProviderFailover } from 'server/DataSources/AI/failover.js';
import { buildVisionProviders } from 'server/DataSources/AI/vision/index.js';
import type { ImageAgentStyle } from 'server/Types/graphql.js';
import { buildScoreSystemPrompt, buildScoreUserPrompt } from './prompt.js';

function parseScore(raw: string): ImageAgentJobScore | null {
  const parsed = parseModelJson(raw);
  if (!parsed) {
    return null;
  }
  const num = (key: string) => (typeof parsed[key] === 'number' ? parsed[key] as number : 0);
  const suggestions = Array.isArray(parsed.suggestions)
    ? parsed.suggestions.filter((s): s is string => typeof s === 'string').slice(0, 3)
    : [];
  const relevance = num('relevance');
  const overall = num('overall');
  const pass = typeof parsed.pass === 'boolean'
    ? parsed.pass
    : overall >= 7 && relevance >= 6;

  return {
    relevance,
    quality: num('quality'),
    styleMatch: num('style_match'),
    composition: num('composition'),
    overall,
    pass,
    suggestions,
  };
}

/**
 * Vision review across the provider chain. Throws when no provider could
 * produce a usable score - the caller records the image as unreviewed rather
 * than inventing a pass for it.
 */
export async function scoreImage(
  buffer: Buffer,
  request: string,
  imagePrompt: string,
  style: ImageAgentStyle,
): Promise<ImageAgentJobScore> {
  const text = await runProviderFailover(
    buildVisionProviders({
      system: buildScoreSystemPrompt(),
      user: buildScoreUserPrompt(request, imagePrompt, style),
      image: buffer,
      mime: imageContentType(buffer),
      // Reasoning tokens come out of the same budget before the JSON starts.
      maxTokens: 2048,
      temperature: 0.1,
    }),
    'vision',
  );

  const score = parseScore(text);
  if (!score) {
    throw new Error(`Vision score could not be parsed: ${text.slice(0, 200)}`);
  }
  return score;
}
