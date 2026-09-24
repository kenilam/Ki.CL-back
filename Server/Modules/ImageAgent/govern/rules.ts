import { ImageAgentRejection } from 'server/Types/graphql.js';

export type RuleVerdict = {
  rejection: ImageAgentRejection;
  reason: string;
};

/** Whitespace-collapsed, as stored and as shown back to the person. */
export function normalisePrompt(raw: string): string {
  return raw.replace(/\s+/g, ' ').trim();
}

/*
 * Only terms that mean one thing. Anything a normal picture request could
 * contain - "naked mole rat", "chicken breast", "murder of crows", "photo
 * bomb" - is left to the moderation model, which reads the whole sentence.
 * This list exists so the plainest cases cost no call at all.
 */
const SEXUAL = /\b(porn\w*|nsfw|hentai|xxx|erotic\w*|genital\w*|orgasm\w*|fetish\w*|bdsm|blowjob\w*|masturbat\w*|intercourse|topless|rape\w*|rapist\w*|pedophil\w*|paedophil\w*|loli\w*)\b/i;

const VIOLENT = /\b(gore|gory|behead\w*|decapitat\w*|dismember\w*|mutilat\w*|tortur\w*|massacre\w*|genocide|lynch\w*|bloodbath|blood bath|mass shooting|school shooting|terrorist attack|self[- ]harm|suicide)\b/i;

/**
 * Text aimed at the model rather than at a picture. A prompt that tries to
 * rewrite the agent's instructions is not a picture request, whatever else it
 * says.
 */
const INJECTION = /\b(ignore (all |any |the )?(previous|prior|above) (instructions|prompts?|rules)|system prompt|you are now|new instructions|developer mode|jailbreak|do anything now)\b/i;

const URL = /\b(https?:\/\/|www\.)\S+/i;

function letterCount(text: string): number {
  return (text.match(/\p{L}/gu) ?? []).length;
}

/** Share of distinct characters, over the letters and digits only. */
function characterVariety(text: string): number {
  const chars = text.toLowerCase().replace(/[^\p{L}\p{N}]/gu, '');
  if (chars.length === 0) {
    return 0;
  }
  return new Set(chars).size / chars.length;
}

/** Share of distinct words. Low means the same word over and over. */
function wordVariety(text: string): { ratio: number; words: number } {
  const words = text.toLowerCase().split(/\s+/).filter(Boolean);
  if (words.length === 0) {
    return { ratio: 0, words: 0 };
  }
  return { ratio: new Set(words).size / words.length, words: words.length };
}

/**
 * The free checks. Anything caught here never reaches a model, and a
 * rejection here still counts against the caller's allowance.
 */
export function checkRules(prompt: string): RuleVerdict | null {
  if (SEXUAL.test(prompt)) {
    return {
      rejection: ImageAgentRejection.UnsafeSexual,
      reason: 'Sexual content is not something this agent draws.',
    };
  }

  if (VIOLENT.test(prompt)) {
    return {
      rejection: ImageAgentRejection.UnsafeViolent,
      reason: 'Graphic violence is not something this agent draws.',
    };
  }

  if (INJECTION.test(prompt)) {
    return {
      rejection: ImageAgentRejection.Spam,
      reason: 'Describe the picture you want. Instructions to the model are not a picture.',
    };
  }

  if (URL.test(prompt)) {
    return {
      rejection: ImageAgentRejection.Spam,
      reason: 'The agent cannot open links. Describe the picture in words.',
    };
  }

  if (letterCount(prompt) < 3) {
    return {
      rejection: ImageAgentRejection.Spam,
      reason: 'Too short to draw. Say what should be in the picture.',
    };
  }

  const { ratio, words } = wordVariety(prompt);
  if (words >= 6 && ratio < 0.3) {
    return {
      rejection: ImageAgentRejection.Spam,
      reason: 'The same word repeated is not a picture.',
    };
  }

  if (prompt.length >= 12 && characterVariety(prompt) < 0.2) {
    return {
      rejection: ImageAgentRejection.Spam,
      reason: 'That reads as keyboard noise rather than a picture.',
    };
  }

  return null;
}
