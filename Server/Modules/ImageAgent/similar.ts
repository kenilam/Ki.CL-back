import { ImageAgentThreads } from 'server/DataSources/MongoDB/ImageAgentThreads/Model.js';
import { ImageAgentRole } from 'server/Types/graphql.js';
import { visible, type LeanImageAgentThread } from './types.js';

/** Recent conversations looked through. Past this, a match is unlikely to be wanted. */
const SCAN = 50;

/** Share of the new prompt's words an old conversation has to contain. */
const THRESHOLD = 0.6;

/** Words that say nothing about the picture. */
const STOP_WORDS = new Set([
  'a', 'an', 'and', 'any', 'are', 'as', 'at', 'be', 'by', 'can', 'for', 'from',
  'in', 'into', 'is', 'it', 'its', 'me', 'my', 'of', 'on', 'or', 'please', 'show',
  'some', 'that', 'the', 'this', 'to', 'under', 'with', 'draw', 'make', 'picture',
  'image', 'want', 'like', 'would', 'just',
]);

/** The words that carry meaning, lower-cased, with a plain trailing "s" dropped. */
function words(text: string): Set<string> {
  return new Set(
    text
      .toLowerCase()
      .split(/[^\p{L}\p{N}]+/u)
      .filter((word) => word.length > 1 && !STOP_WORDS.has(word))
      .map((word) => (word.length > 3 && word.endsWith('s') && !word.endsWith('ss')
        ? word.slice(0, -1)
        : word)),
  );
}

/** What the person has asked for in a conversation, and what the agent took it to mean. */
function said(thread: LeanImageAgentThread): Set<string> {
  const lines = visible(thread.messages)
    .filter((entry) => entry.role === ImageAgentRole.User && entry.text)
    .map((entry) => entry.text as string);
  return words([...lines, thread.brief ?? ''].join(' '));
}

/**
 * The caller's conversations that already cover most of what `text` asks
 * for, closest first. Word overlap rather than a model: this runs as the
 * person types, and costs nothing but a read.
 */
export async function similarThreads(
  ownerGUID: string,
  text: string,
  limit = 3,
): Promise<LeanImageAgentThread[]> {
  const asked = words(text);
  if (!asked.size) {
    return [];
  }

  const threads = await ImageAgentThreads.find({ ownerGUID })
    .sort({ updatedAt: -1 })
    .limit(SCAN)
    .lean<LeanImageAgentThread[]>();

  return threads
    .map((thread) => {
      const known = said(thread);
      const shared = [...asked].filter((word) => known.has(word)).length;
      return { thread, score: shared / asked.size };
    })
    .filter(({ score }) => score >= THRESHOLD)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(({ thread }) => thread);
}
