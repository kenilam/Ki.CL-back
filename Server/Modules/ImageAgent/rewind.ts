import { Types } from 'mongoose';

import { ImageAgentJobs } from 'server/DataSources/MongoDB/ImageAgentJobs/Model.js';
import { ImageAgentThreads } from 'server/DataSources/MongoDB/ImageAgentThreads/Model.js';
import {
  ImageAgentMessageKind,
  ImageAgentRole,
  ImageAgentThreadStatus,
} from 'server/Types/graphql.js';
import { OTHER_FOLLOW_UP } from './agent/clarify.js';
import { visible, type LeanImageAgentThread } from './types.js';

/**
 * Goes back to one of the person's messages and asks it again. Everything from
 * that message on is hidden, and the message is added again as a new one, so it
 * counts and waits like any other message.
 *
 * The brief, style and question count go back too, to what they were for the
 * last picture still in view, so the agent answers as it would have at that
 * point.
 *
 * Resolves to the text to answer, or null when that message can't be rewound to
 * or the thread changed in the meantime.
 */
export async function rewindTo(
  thread: LeanImageAgentThread,
  messageId: string,
  address: string | null,
): Promise<string | null> {
  const shown = visible(thread.messages);
  const at = shown.findIndex((entry) => entry.id === messageId);
  const target = shown[at];
  if (!target || target.role !== ImageAgentRole.User || !target.text) {
    return null;
  }

  const kept = shown.slice(0, at);
  const now = new Date();
  const gone = new Set(shown.slice(at).map((entry) => entry.id));

  const lastPicture = [...kept].reverse().find(
    (entry) => entry.kind === ImageAgentMessageKind.Image && entry.jobId,
  );
  const job = lastPicture
    ? await ImageAgentJobs.findById(lastPicture.jobId).lean()
    : null;
  const asked = kept
    .slice(lastPicture ? kept.indexOf(lastPicture) + 1 : 0)
    .filter((entry) => entry.kind === ImageAgentMessageKind.Question
      && entry.text !== OTHER_FOLLOW_UP)
    .length;

  const messages = [
    ...thread.messages.map((entry) => (gone.has(entry.id) ? { ...entry, removedAt: now } : entry)),
    { ...target, id: new Types.ObjectId().toString(), addressKey: address, at: now, removedAt: null },
  ];

  // Guarded on the thread being as it was read, so two clicks go back once.
  const updated = await ImageAgentThreads.updateOne(
    {
      _id: String(thread._id),
      status: ImageAgentThreadStatus.Idle,
      updatedAt: thread.updatedAt,
    },
    {
      $set: {
        messages,
        status: ImageAgentThreadStatus.Thinking,
        brief: job?.prompt ?? null,
        style: job?.style ?? null,
        asked,
        activity: null,
      },
    },
  );

  return updated.matchedCount ? target.text : null;
}
