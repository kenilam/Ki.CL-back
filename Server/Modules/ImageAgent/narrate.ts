import type { ImageAgentStepKind } from 'server/DataSources/MongoDB/ImageAgentJobs/Model.js';
import { translate } from 'server/Helpers/translate.js';
import type { ImageAgentStyle } from 'server/Types/graphql.js';

/** Longest subject that still reads as a phrase inside a sentence. */
const MAX_SUBJECT = 60;

/** Words that cannot end a phrase. */
const DANGLING = new Set([
  'a', 'an', 'and', 'at', 'beneath', 'by', 'for', 'from', 'her', 'his', 'in',
  'into', 'its', 'of', 'on', 'or', 'over', 'the', 'their', 'to', 'under', 'with',
]);

/**
 * A leading "a minimal illustration of", "a 3D render of" and the like. The
 * style is said separately, so the subject drops it rather than say it twice.
 */
const STYLE_PREFIX =
  /^(?:an?\s+)?(?:[\w-]+\s+){0,3}?(?:photograph|photo|illustration|render|picture|image|drawing|painting|design)\s+of\s+/i;

/**
 * The brief as a short phrase to put inside a sentence: its first sentence,
 * without a leading style, lower-cased at the start, cut at a word if long.
 * "A minimal illustration of a playful cat on a rug. Soft light." -> "a playful cat on a rug"
 */
export function subjectOf(brief: string): string {
  const first = (brief.split(/(?<=[.!?])\s/)[0] ?? brief).trim().replace(/[.!?]+$/, '');
  const bare = first.replace(STYLE_PREFIX, '') || first;
  // The main clause: "a girl in a field, her hair blown by the wind" -> "a girl in a field".
  const clause = bare.split(/[,;:]/)[0]?.trim() || bare;
  const phrase = clause.charAt(0).toLowerCase() + clause.slice(1);
  if (phrase.length <= MAX_SUBJECT) {
    return phrase;
  }
  // Cut at a word, then back to just before the last small word, so the phrase
  // ends where one of its parts does: "... on a beach with many" -> "... on a
  // beach". Only dropping small words at the end would keep "with many".
  const words = phrase.slice(0, MAX_SUBJECT).split(' ').slice(0, -1);
  let lastSmall = words.length - 1;
  while (lastSmall > 0 && !DANGLING.has(words[lastSmall]!.toLowerCase())) {
    lastSmall -= 1;
  }
  const kept = lastSmall > 0 ? words.slice(0, lastSmall) : words;
  while (kept.length > 1 && DANGLING.has(kept[kept.length - 1]!.toLowerCase())) {
    kept.pop();
  }
  return kept.join(' ');
}

/**
 * What the person reads after each drawing step, in terms of their picture.
 * Built from what the agent already knows, so it costs no model call.
 */
export function progressAfter(
  kind: ImageAgentStepKind,
  brief: string,
  style: ImageAgentStyle,
): string {
  // Drawing names the style, so that step has a sentence for each one.
  const step = kind === 'REFINE' ? `${kind}_${style}` : kind;

  // A step without a sentence of its own reads the plain key.
  return translate('api', 'image_agent_progress', {
    context: step.toLowerCase(),
    subject: subjectOf(brief),
  });
}

/** The thinking step before a decision: about the earlier picture, when there is one. */
export function planning(brief: string | null): string {
  return brief
    ? translate('api', 'image_agent_planning_change', { subject: subjectOf(brief) })
    : translate('api', 'image_agent_planning');
}
