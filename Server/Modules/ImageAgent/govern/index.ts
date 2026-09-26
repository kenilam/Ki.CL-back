import { ProviderLimitError } from 'server/Modules/TaxonVisual/providerLimitError.js';
import type { ImageAgentRejection } from 'server/Types/graphql.js';
import { classifyPrompt } from './classify.js';
import { moderatePrompt, reasonForModeration } from './moderation.js';

export { checkRules, normalisePrompt } from './rules.js';
export { allowanceFor, assertWithinQuota, type Allowance } from './quota.js';

export type GovernVerdict = {
  rejection: ImageAgentRejection | null;
  reason: string | null;
  /** Which checks actually ran, for the job's trace. */
  checks: string[];
};

const LOG = '[ImageAgent]';

/**
 * The model checks, run after the free ones have passed.
 *
 * Moderation goes first because it's free and made for safety. The classifier
 * comes next because moderation can't tell whether the text is about a picture
 * at all, and that check is what stops "hello" and "asdf" from using up a
 * drawing.
 *
 * When the classifier is down but moderation ran, the message goes through:
 * safety was checked, and only the is-it-a-picture question went unanswered.
 * When neither could run, this throws. Nothing has read the text, and sending
 * it to the image model unread is what this layer is meant to prevent.
 */
export async function governPrompt(
  text: string,
  history: string | null = null,
): Promise<GovernVerdict> {
  const checks: string[] = [];

  let moderated = false;
  try {
    const moderation = await moderatePrompt(text);
    if (moderation) {
      moderated = true;
      checks.push('moderation');
      if (moderation.flagged) {
        console.log(`${LOG} moderation rejected category=${moderation.category}`);
        return {
          rejection: moderation.rejection,
          reason: reasonForModeration(moderation),
          checks,
        };
      }
    }
  } catch (error) {
    /*
     * Only an account that's out of credit stops the request here. The
     * classifier has its own providers and retries and can handle safety on its
     * own, so a short rate limit on moderation isn't worth failing over.
     */
    if (error instanceof ProviderLimitError && !error.retryable) {
      throw error;
    }
    const message = error instanceof Error ? error.message : String(error);
    console.warn(`${LOG} moderation unavailable: ${message}`);
  }

  try {
    const verdict = await classifyPrompt(text, history);
    checks.push('classifier');
    if (verdict.rejection) {
      console.log(`${LOG} classifier rejected verdict=${verdict.rejection}`);
      return { rejection: verdict.rejection, reason: verdict.reason, checks };
    }
    return { rejection: null, reason: null, checks };
  } catch (error) {
    if (error instanceof ProviderLimitError) {
      throw error;
    }
    const message = error instanceof Error ? error.message : String(error);
    if (!moderated) {
      throw new Error(`No governor check could run: ${message}`);
    }
    console.warn(`${LOG} classifier unavailable, moderation passed: ${message}`);
    return { rejection: null, reason: null, checks };
  }
}
