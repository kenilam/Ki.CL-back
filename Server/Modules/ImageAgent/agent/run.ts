import {
  ImageAgentStepKind,
  type ImageAgentJobScore,
} from 'server/DataSources/MongoDB/ImageAgentJobs/Model.js';
import { runProviderFailover } from 'server/Modules/TaxonVisual/providers/failover.js';
import { buildImageProviders } from 'server/Modules/TaxonVisual/providers/image/index.js';
import type { GeneratedImage } from 'server/Modules/TaxonVisual/providers/image/types.js';
import type { ImageAgentStyle } from 'server/Types/graphql.js';
import { persistImage, type PersistedImage } from './persist.js';
import { refinePrompt, retryPrompt } from './refinePrompt.js';
import { scoreImage } from './scoreImage.js';

const LOG = '[ImageAgent]';

/** Most images to draw per request before keeping the best. */
function maxAttempts(): number {
  const value = Number(process.env.IMAGE_AGENT_MAX_ATTEMPTS);
  return Number.isInteger(value) && value >= 1 ? value : 2;
}

/**
 * The image provider refused the prompt on content grounds. The governor
 * passed it, so this is the provider's own filter catching something ours did
 * not - reported as a rejection, not a failure.
 */
export class ContentRejectedError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ContentRejectedError';
  }
}

export type AgentInput = {
  jobId: string;
  prompt: string;
  style: ImageAgentStyle;
};

export type AgentOutcome = PersistedImage & {
  imagePrompt: string;
  /** Null when no provider could review the image. */
  score: ImageAgentJobScore | null;
  attempts: number;
};

export type RecordStep = (kind: ImageAgentStepKind, detail: string) => Promise<void>;

type Candidate = {
  image: GeneratedImage;
  imagePrompt: string;
  score: ImageAgentJobScore | null;
};

function isContentRejection(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  const lower = message.toLowerCase();
  return lower.includes('content_policy') || lower.includes('content policy');
}

/**
 * The agent loop, as a fixed sequence rather than a model choosing tools.
 *
 * The Python original let the model pick which tool to call next, but its
 * system prompt spelled the order out anyway, and every step here has to run
 * through the provider failover chain - which the tool-calling protocol does
 * not survive. So the order is code, and what the models decide is the
 * content: the prompt, the picture, and the score.
 *
 * refine → generate → score → (retry once with the notes) → persist the best.
 */
export async function runImageAgent(
  input: AgentInput,
  record: RecordStep,
): Promise<AgentOutcome> {
  const { jobId, prompt, style } = input;
  const limit = maxAttempts();
  const startedAt = Date.now();

  let best: Candidate | null = null;
  let imagePrompt = '';
  let attempts = 0;

  for (let attempt = 0; attempt < limit; attempt += 1) {
    attempts += 1;

    if (attempt === 0) {
      imagePrompt = await refinePrompt(prompt, style);
      await record(ImageAgentStepKind.Refine, imagePrompt);
    } else {
      const previous = best?.imagePrompt ?? imagePrompt;
      const suggestions = best?.score?.suggestions ?? [];
      imagePrompt = await retryPrompt(prompt, style, previous, suggestions);
      await record(ImageAgentStepKind.Refine, imagePrompt);
    }

    const generateStartedAt = Date.now();
    let image: GeneratedImage;
    try {
      image = await runProviderFailover(buildImageProviders(imagePrompt), 'image');
    } catch (error) {
      if (isContentRejection(error)) {
        throw new ContentRejectedError(
          'The image provider declined to draw this request.',
        );
      }
      throw error;
    }
    await record(
      ImageAgentStepKind.Generate,
      `${image.generator} · ${image.buffer.length} bytes · ${Date.now() - generateStartedAt}ms`,
    );

    let score: ImageAgentJobScore | null;
    try {
      score = await scoreImage(image.buffer, prompt, imagePrompt, style);
      await record(
        ImageAgentStepKind.Score,
        `overall ${score.overall} · relevance ${score.relevance} · ${score.pass ? 'pass' : 'fail'}`
        + (score.suggestions.length ? ` · ${score.suggestions.join('; ')}` : ''),
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.warn(`${LOG} score unavailable job=${jobId} attempt=${attempts}: ${message}`);
      /*
       * Recorded as unreviewed. Sending an unreviewed picture is fine.
       * Attaching a made-up score to it isn't.
       */
      score = null;
      await record(ImageAgentStepKind.Score, 'no reviewer available; delivered unreviewed');
    }

    const candidate: Candidate = { image, imagePrompt, score };
    if (!best || (candidate.score?.overall ?? 0) > (best.score?.overall ?? 0)) {
      best = candidate;
    }

    // No score means no notes, so a retry has nothing to improve on.
    if (!score || score.pass) {
      break;
    }

    if (attempt + 1 < limit) {
      await record(
        ImageAgentStepKind.Retry,
        `scored ${score.overall}; drawing again with the reviewer's notes`,
      );
    }
  }

  if (!best) {
    throw new Error('Image agent produced no image');
  }

  const persisted = await persistImage(jobId, best.image);
  await record(ImageAgentStepKind.Persist, persisted.url);

  console.log(
    `${LOG} done job=${jobId} attempts=${attempts} generator=${persisted.generator} `
    + `overall=${best.score?.overall ?? 'n/a'} ms=${Date.now() - startedAt}`,
  );

  return {
    ...persisted,
    imagePrompt: best.imagePrompt,
    score: best.score,
    attempts,
  };
}
