import { Types } from 'mongoose';

import {
  ImageAgentJobs,
  ImageAgentJobStatus,
  ImageAgentStepKind,
} from 'server/DataSources/MongoDB/ImageAgentJobs/Model.js';
import { ImageAgentThreads } from 'server/DataSources/MongoDB/ImageAgentThreads/Model.js';
import {
  ImageAgentMessageKind,
  ImageAgentRole,
  ImageAgentThreadStatus,
} from 'server/Types/graphql.js';
import { publishImageAgentThreadUpdated } from './pubsub.js';
import { toResult, type LeanImageAgentThread } from './types.js';

const LOG = '[ImageAgent]';


const MINUTE_MS = 60 * 1000;

/**
 * How long a turn can go without a change before it counts as dead. Drawing
 * writes a step at every stage, so it's quiet for one stage at most, and the
 * slowest stage is every image provider timing out in turn. Reading a message
 * is a handful of short model calls.
 */
const THINKING_LIMIT_MS = 2 * MINUTE_MS;
const DRAWING_LIMIT_MS = 8 * MINUTE_MS;

const COPY = {
  interrupted: 'I stopped before can finish the last request.',
};

/**
 * Closes stalled turns so the person can carry on.
 *
 * The agent's turn runs in the process that took the message. A restart (a
 * deploy, a crash, a file change in development) ends it halfway, and the
 * thread would stay THINKING or DRAWING for good. That blocks more than one
 * thread, because the quota refuses every message while any of the caller's
 * threads is busy. So a turn that has been quiet for too long is closed with a
 * failure message, and its drawing, if there is one, is marked as an error.
 *
 * This runs on read, for the threads a request is about to look at, instead of
 * on a timer or at startup. With more than one instance, a starting instance
 * can't tell a dead turn from one another instance is still working on.
 */
export async function recoverStalled(scope: {
  ownerGUID: string;
  /** One thread; all of the caller's when left out. */
  id?: string;
}): Promise<void> {
  const now = Date.now();
  const caller = scope.id
    ? { _id: scope.id, ownerGUID: scope.ownerGUID }
    : { ownerGUID: scope.ownerGUID };

  const stalled = await ImageAgentThreads.find({
    $and: [
      caller,
      {
        $or: [
          {
            status: ImageAgentThreadStatus.Thinking,
            updatedAt: { $lt: new Date(now - THINKING_LIMIT_MS) },
          },
          {
            status: ImageAgentThreadStatus.Drawing,
            updatedAt: { $lt: new Date(now - DRAWING_LIMIT_MS) },
          },
        ],
      },
    ],
  }).lean<LeanImageAgentThread[]>();

  await Promise.all(stalled.map(async (thread) => {
    // Guarded on the same state, so a turn that moved on meanwhile is left alone.
    const closed = await ImageAgentThreads.findOneAndUpdate(
      { _id: String(thread._id), status: thread.status, updatedAt: thread.updatedAt },
      {
        $push: {
          messages: {
            id: new Types.ObjectId().toString(),
            role: ImageAgentRole.Agent,
            kind: ImageAgentMessageKind.Failure,
            text: COPY.interrupted,
            jobId: null,
            assetId: null,
            score: null,
            rejection: null,
            exhaustion: null,
            choices: [],
            at: new Date(),
          },
        },
        $set: { status: ImageAgentThreadStatus.Idle, activity: null },
      },
      { new: true },
    ).lean<LeanImageAgentThread | null>();

    if (!closed) {
      return;
    }

    // Otherwise the progress line of a dead drawing would spin forever.
    const cleared = await ImageAgentThreads.findOneAndUpdate(
      { _id: String(thread._id) },
      { $pull: { messages: { kind: ImageAgentMessageKind.Progress } } },
      { new: true },
    ).lean<LeanImageAgentThread | null>();

    await ImageAgentJobs.updateMany(
      { threadId: String(thread._id), status: ImageAgentJobStatus.Running },
      {
        $set: { status: ImageAgentJobStatus.Error, error: 'interrupted' },
        $push: { steps: { kind: ImageAgentStepKind.Fail, detail: 'interrupted', at: new Date() } },
      },
    );

    console.warn(`${LOG} recovered stalled thread=${String(thread._id)} status=${thread.status}`);
    publishImageAgentThreadUpdated(toResult(cleared ?? closed));
  }));
}
