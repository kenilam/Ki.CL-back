import { Types } from 'mongoose';

import {
  ImageAgentJobs,
  ImageAgentJobStatus,
  ImageAgentStepKind,
  type ImageAgentJobScore,
} from 'server/DataSources/MongoDB/ImageAgentJobs/Model.js';
import {
  ImageAgentThreads,
  type ImageAgentThreadMessage,
} from 'server/DataSources/MongoDB/ImageAgentThreads/Model.js';
import { ProviderLimitError } from 'server/Modules/TaxonVisual/providerLimitError.js';
import {
  ImageAgentMessageKind,
  ImageAgentRejection,
  ImageAgentRole,
  ImageAgentThreadStatus,
  type ImageAgentStyle,
} from 'server/Types/graphql.js';
import {
  clarify,
  OTHER_CHOICE,
  OTHER_FOLLOW_UP,
  SKIP_CHOICE,
} from './agent/clarify.js';
import { ContentRejectedError, runImageAgent } from './agent/run.js';
import { checkRules, governPrompt } from './govern/index.js';
import { planning, progressAfter } from './narrate.js';
import { publishImageAgentThreadUpdated } from './pubsub.js';
import { toResult, visible, type LeanImageAgentThread } from './types.js';

const LOG = '[ImageAgent]';

const COPY = {
  drawn: 'Here it is.',
  drawnUnreviewed: 'Here it is. No reviewer was available, so it went out unchecked.',
  drawnBelowBar: 'Here it is. It didn’t pass review, but it was the best of the attempts.',
  error: 'Something went wrong while drawing.',
  exhaustedBilling: 'Every drawing provider is out of credit, and waiting will not bring it back.',
  exhaustedRefills: 'The drawing providers are out of quota for now. Try again later.',
  providerRefused: 'The image provider declined to draw that.',
};

type Draft = Omit<ImageAgentThreadMessage, 'id' | 'at'>;

function message(draft: Partial<Draft> & Pick<Draft, 'role' | 'kind'>): ImageAgentThreadMessage {
  return {
    id: new Types.ObjectId().toString(),
    text: null,
    jobId: null,
    assetId: null,
    score: null,
    rejection: null,
    exhaustion: null,
    ...draft,
    at: new Date(),
  };
}

async function publish(threadId: string): Promise<void> {
  const doc = await ImageAgentThreads.findById(threadId).lean<LeanImageAgentThread | null>();
  if (doc) {
    publishImageAgentThreadUpdated(toResult(doc));
  }
}

/** What the person reads while the agent is reading their message. */
const ACTIVITY = {
  reading: 'Reading your message.',
  checking: 'Checking it is something we can draw.',
};

/** Say what the agent is doing now, while the thread is THINKING. */
async function doing(threadId: string, activity: string): Promise<void> {
  await ImageAgentThreads.updateOne(
    { _id: threadId, status: ImageAgentThreadStatus.Thinking },
    { $set: { activity } },
  );
  await publish(threadId);
}

/** Append a reply and hand the turn back to the person. */
async function reply(threadId: string, draft: ImageAgentThreadMessage): Promise<void> {
  await ImageAgentThreads.updateOne(
    { _id: threadId },
    {
      $push: { messages: draft },
      $set: { status: ImageAgentThreadStatus.Idle, activity: null },
    },
  );
  await publish(threadId);
}

/**
 * Take a refused message out of the conversation, so it is not shown or
 * listed again. Soft, like going back over a message: it still counts
 * against the person's limits.
 */
async function withdraw(threadId: string): Promise<void> {
  const thread = await ImageAgentThreads.findById(threadId).lean<LeanImageAgentThread | null>();
  const said = thread
    ? visible(thread.messages).reverse().find((entry) => entry.role === ImageAgentRole.User)
    : undefined;
  if (!said) {
    return;
  }
  await ImageAgentThreads.updateOne(
    { _id: threadId },
    { $set: { 'messages.$[said].removedAt': new Date() } },
    { arrayFilters: [{ 'said.id': said.id }] },
  );
}

/** The conversation as lines a model can read: what was said, by whom. */
function transcript(messages: ImageAgentThreadMessage[]): string {
  return messages
    .filter((entry) => entry.text && (
      entry.role === ImageAgentRole.User
      || entry.kind === ImageAgentMessageKind.Question
      || entry.kind === ImageAgentMessageKind.Text
    ))
    .map((entry) => `${entry.role === ImageAgentRole.User ? 'Person' : 'Agent'}: ${entry.text}`)
    .join('\n');
}

function exhaustionKind(error: unknown): 'REFILLS' | 'BILLING' | null {
  if (!(error instanceof ProviderLimitError)) {
    return null;
  }
  return error.needsBilling ? 'BILLING' : 'REFILLS';
}

async function failure(threadId: string, jobId: string | null, error: unknown): Promise<void> {
  const detail = error instanceof Error ? error.message : String(error);
  const exhaustion = exhaustionKind(error);
  console.warn(`${LOG} failed thread=${threadId} job=${jobId ?? '-'}: ${detail}`);

  if (jobId) {
    await ImageAgentJobs.updateOne(
      { _id: jobId },
      {
        $set: {
          status: exhaustion ? ImageAgentJobStatus.Exhausted : ImageAgentJobStatus.Error,
          error: detail,
        },
        $push: { steps: { kind: ImageAgentStepKind.Fail, detail, at: new Date() } },
      },
    );
  }

  await reply(threadId, message({
    role: ImageAgentRole.Agent,
    kind: ImageAgentMessageKind.Failure,
    // eslint-disable-next-line no-nested-ternary
    text: exhaustion === 'BILLING'
      ? COPY.exhaustedBilling
      : exhaustion === 'REFILLS'
        ? COPY.exhaustedRefills
        : COPY.error,
    exhaustion,
    jobId: jobId ? new Types.ObjectId(jobId) : null,
  }));
}

function deliveryLine(score: ImageAgentJobScore | null): string {
  if (!score) {
    return COPY.drawnUnreviewed;
  }
  return score.pass ? COPY.drawn : COPY.drawnBelowBar;
}

/** Draw the brief, narrating each step into one PROGRESS message. */
async function draw(
  threadId: string,
  ownerGUID: string,
  address: string | null,
  brief: string,
  style: ImageAgentStyle,
): Promise<void> {
  const job = await ImageAgentJobs.create({
    ownerGUID,
    addressKey: address,
    threadId: new Types.ObjectId(threadId),
    prompt: brief,
    style,
    status: ImageAgentJobStatus.Running,
    steps: [{ kind: ImageAgentStepKind.Govern, detail: 'passed', at: new Date() }],
  });
  const jobId = String(job._id);

  const progress = message({
    role: ImageAgentRole.Agent,
    kind: ImageAgentMessageKind.Progress,
    text: progressAfter(ImageAgentStepKind.Govern, brief, style),
    jobId: job._id,
  });

  await ImageAgentThreads.updateOne(
    { _id: threadId },
    {
      $push: { messages: progress },
      // Questions are counted per picture, so the next one may be refined too.
      $set: { status: ImageAgentThreadStatus.Drawing, brief, style, asked: 0, activity: null },
    },
  );
  await publish(threadId);

  const record = async (kind: ImageAgentStepKind, detail: string) => {
    await ImageAgentJobs.updateOne(
      { _id: jobId },
      { $push: { steps: { kind, detail, at: new Date() } } },
    );
    await ImageAgentThreads.updateOne(
      { _id: threadId, 'messages.id': progress.id },
      { $set: { 'messages.$.text': progressAfter(kind, brief, style) } },
    );
    await publish(threadId);
  };

  try {
    const outcome = await runImageAgent({ jobId, prompt: brief, style }, record);

    await ImageAgentJobs.updateOne(
      { _id: jobId },
      {
        $set: {
          status: ImageAgentJobStatus.Ready,
          imagePrompt: outcome.imagePrompt,
          assetId: new Types.ObjectId(outcome.assetId),
          score: outcome.score,
          attempts: outcome.attempts,
        },
      },
    );

    /*
     * The progress message becomes the picture, in place. A second message
     * would leave "Nearly there." standing above the thing it was waiting for.
     */
    await ImageAgentThreads.updateOne(
      { _id: threadId, 'messages.id': progress.id },
      {
        $set: {
          'messages.$.kind': ImageAgentMessageKind.Image,
          'messages.$.text': deliveryLine(outcome.score),
          'messages.$.assetId': new Types.ObjectId(outcome.assetId),
          'messages.$.score': outcome.score,
          'messages.$.at': new Date(),
          status: ImageAgentThreadStatus.Idle,
        },
      },
    );
    await publish(threadId);
  } catch (error) {
    // The turn failed, so drop its progress message.
    await ImageAgentThreads.updateOne(
      { _id: threadId },
      { $pull: { messages: { id: progress.id } } },
    );

    if (error instanceof ContentRejectedError) {
      await ImageAgentJobs.updateOne(
        { _id: jobId },
        { $set: { status: ImageAgentJobStatus.Rejected, error: error.message } },
      );
      await reply(threadId, message({
        role: ImageAgentRole.Agent,
        kind: ImageAgentMessageKind.Refusal,
        text: COPY.providerRefused,
        rejection: ImageAgentRejection.UnsafeOther,
        jobId: job._id,
      }));
      return;
    }

    await failure(threadId, jobId, error);
  }
}

/**
 * The agent's turn, after the person's message has been recorded and the
 * mutation has returned. Everything the person sees from here arrives over
 * the subscription.
 *
 * govern → clarify (up to three questions per picture) → draw.
 */
export async function respond(
  threadId: string,
  ownerGUID: string,
  address: string | null,
  text: string,
): Promise<void> {
  try {
    await doing(threadId, ACTIVITY.reading);

    const local = checkRules(text);
    if (local) {
      console.log(`${LOG} rejected thread=${threadId} rejection=${local.rejection} (local rules)`);
      await withdraw(threadId);
      await reply(threadId, message({
        role: ImageAgentRole.Agent,
        kind: ImageAgentMessageKind.Refusal,
        text: local.reason,
        rejection: local.rejection,
      }));
      return;
    }

    const thread = await ImageAgentThreads.findById(threadId).lean<LeanImageAgentThread | null>();
    if (!thread) {
      return;
    }

    /*
     * "Something else" picked from a question's choices: ask for it in the
     * person's own words. Answered here, without the governor or the
     * clarifier, and not counted as a question - the person is still
     * answering the one before.
     */
    const messages = visible(thread.messages);

    const asked = messages.at(-2);
    if (
      asked?.kind === ImageAgentMessageKind.Question
      && asked.choices?.includes(OTHER_CHOICE)
      && text.trim().toLowerCase() === OTHER_CHOICE.toLowerCase()
    ) {
      await reply(threadId, message({
        role: ImageAgentRole.Agent,
        kind: ImageAgentMessageKind.Question,
        text: OTHER_FOLLOW_UP,
        choices: [SKIP_CHOICE],
      }));
      return;
    }

    // Everything before the message just sent.
    const earlier = transcript(messages.slice(0, -1));

    await doing(threadId, ACTIVITY.checking);
    const verdict = await governPrompt(text, earlier || null);
    if (verdict.rejection) {
      console.log(`${LOG} rejected thread=${threadId} rejection=${verdict.rejection}`);
      await withdraw(threadId);
      await reply(threadId, message({
        role: ImageAgentRole.Agent,
        kind: ImageAgentMessageKind.Refusal,
        text: verdict.reason,
        rejection: verdict.rejection,
      }));
      return;
    }

    await doing(threadId, planning(thread.brief ?? null));
    const decision = await clarify({
      history: transcript(messages),
      brief: thread.brief ?? null,
      style: thread.style ?? null,
      asked: thread.asked ?? 0,
    });

    if (decision.action === 'ask') {
      await ImageAgentThreads.updateOne({ _id: threadId }, { $inc: { asked: 1 } });
      await reply(threadId, message({
        role: ImageAgentRole.Agent,
        kind: ImageAgentMessageKind.Question,
        text: decision.question,
        choices: decision.choices,
      }));
      return;
    }

    await draw(threadId, ownerGUID, address, decision.brief, decision.style);
  } catch (error) {
    await failure(threadId, null, error);
  }
}
