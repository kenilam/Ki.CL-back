import { withFilter } from 'graphql-subscriptions';
import { Types } from 'mongoose';

import type { Context } from 'server/Context/index.js';
import { ImageAgentThreads } from 'server/DataSources/MongoDB/ImageAgentThreads/Model.js';
import { BadUserInput, NotFound, Unauthenticated } from 'server/Errors/index.js';
import { addressKey } from 'server/Helpers/clientAddress.js';
import { validate } from 'server/Helpers/Validation/validate.js';
import {
  ImageAgentMessageKind,
  ImageAgentRole,
  ImageAgentThreadStatus,
} from 'server/Types/graphql.js';
import { allowanceFor, assertWithinQuota, normalisePrompt } from './govern/index.js';
import { IMAGE_AGENT_THREAD_UPDATED, imageAgentPubSub } from './pubsub.js';
import { recoverStalled } from './recover.js';
import { respond } from './respond.js';
import { rewindTo } from './rewind.js';
import { galleryAssets } from './gallery.js';
import { similarThreads } from './similar.js';
import {
  toResult,
  visible,
  type ImageAgentMessageResult,
  type ImageAgentThreadResult,
  type LeanImageAgentThread,
} from './types.js';
import {
  GallerySchema,
  SendSchema,
  SimilarSchema,
  ThreadSchema,
  ThreadsSchema,
} from './validation.js';

const COPY = {
  nothingToRetry: 'There is nothing to try again.',
};

function requireOwner(context: Context): string {
  const owner = context.tokenPayload?.UserGUID;
  if (!owner) {
    throw Unauthenticated('Authentication required');
  }
  return owner;
}

async function loadThread(id: string, owner: string): Promise<LeanImageAgentThread | null> {
  return ImageAgentThreads.findOne({ _id: id, ownerGUID: owner })
    .lean<LeanImageAgentThread | null>();
}

export default {
  Query: {
    ImageAgentThread: async (_: unknown, args: { id: string }, context: Context) => {
      const owner = requireOwner(context);
      const { id } = validate(ThreadSchema, args);
      await recoverStalled({ ownerGUID: owner, id });
      const doc = await loadThread(id, owner);
      return doc ? toResult(doc) : null;
    },

    ImageAgentThreads: async (
      _: unknown,
      args: { limit?: number | null },
      context: Context,
    ) => {
      const owner = requireOwner(context);
      const input = validate(ThreadsSchema, args);
      await recoverStalled({ ownerGUID: owner });
      const docs = await ImageAgentThreads.find({ ownerGUID: owner })
        .sort({ updatedAt: -1 })
        .limit(input.limit ?? 20)
        .lean<LeanImageAgentThread[]>();
      return docs.map(toResult);
    },

    ImageAgentSimilar: async (_: unknown, args: { text: string }, context: Context) => {
      const owner = context.tokenPayload?.UserGUID;
      if (!owner) {
        return [];
      }
      const { text } = validate(SimilarSchema, args);
      const docs = await similarThreads(owner, text);
      return docs.map(toResult);
    },

    ImageAgentGallery: async (_: unknown, args: { limit?: number | null }) => {
      const { limit } = validate(GallerySchema, args);
      return galleryAssets(limit ?? 12);
    },

    /*
     * Answered without a token as well: the allowance follows the address, so
     * it reads the same before and after cookies are cleared.
     */
    ImageAgentAllowance: async (_: unknown, __: unknown, context: Context) => {
      const owner = context.tokenPayload?.UserGUID ?? null;
      const address = addressKey(context.ip);
      // A dead turn would otherwise read as busy.
      if (owner) {
        await recoverStalled({ ownerGUID: owner, address });
      }
      const [allowance, running] = await Promise.all([
        allowanceFor({ ownerGUID: owner, address }),
        // Only the caller's own: threads matched by address may be someone else's.
        owner
          ? ImageAgentThreads.find({ ownerGUID: owner, status: { $ne: ImageAgentThreadStatus.Idle } })
            .sort({ updatedAt: -1 })
            .lean<LeanImageAgentThread[]>()
          : [],
      ]);
      return { ...allowance, running: running.map(toResult) };
    },
  },

  Mutation: {
    ImageAgentSend: async (
      _: unknown,
      args: { threadId?: string | null; text: string },
      context: Context,
    ): Promise<ImageAgentThreadResult> => {
      const owner = requireOwner(context);
      const input = validate(SendSchema, args);
      const text = normalisePrompt(input.text);

      if (input.threadId) {
        const existing = await loadThread(input.threadId, owner);
        if (!existing) {
          throw NotFound('No conversation with that id');
        }
      }

      const address = addressKey(context.ip);
      // A dead turn in any of the caller's threads would count as busy below.
      await recoverStalled({ ownerGUID: owner, address });
      await assertWithinQuota({ ownerGUID: owner, address });

      const said = {
        id: new Types.ObjectId().toString(),
        role: ImageAgentRole.User,
        kind: ImageAgentMessageKind.Text,
        text,
        jobId: null,
        assetId: null,
        score: null,
        rejection: null,
        exhaustion: null,
        addressKey: address,
        at: new Date(),
      };

      let id: string;

      if (input.threadId) {
        /*
         * Matched on IDLE as well as on id, so two messages sent at once
         * cannot both start a turn: the second finds nothing to update.
         */
        const updated = await ImageAgentThreads.updateOne(
          { _id: input.threadId, ownerGUID: owner, status: ImageAgentThreadStatus.Idle },
          { $push: { messages: said }, $set: { status: ImageAgentThreadStatus.Thinking } },
        );
        if (updated.matchedCount === 0) {
          throw NotFound('That conversation is busy. Wait for the agent to finish.');
        }
        id = input.threadId;
      } else {
        const created = await ImageAgentThreads.create({
          ownerGUID: owner,
          status: ImageAgentThreadStatus.Thinking,
          messages: [said],
        });
        id = String(created._id);
      }

      void respond(id, owner, address, text);

      const doc = await loadThread(id, owner);
      if (!doc) {
        throw NotFound('No conversation with that id');
      }
      return toResult(doc);
    },

    ImageAgentRetry: async (
      _: unknown,
      args: { threadId: string; messageId?: string | null },
      context: Context,
    ): Promise<ImageAgentThreadResult> => {
      const owner = requireOwner(context);
      const { id } = validate(ThreadSchema, { id: args.threadId });
      const address = addressKey(context.ip);

      await recoverStalled({ ownerGUID: owner, address });
      const thread = await loadThread(id, owner);
      if (!thread) {
        throw NotFound('No conversation with that id');
      }
      if (thread.status !== ImageAgentThreadStatus.Idle) {
        throw BadUserInput(COPY.nothingToRetry);
      }

      const messageId = args.messageId
        ?? [...visible(thread.messages)]
          .reverse()
          .find((entry) => entry.role === ImageAgentRole.User)?.id;
      if (!messageId) {
        throw BadUserInput(COPY.nothingToRetry);
      }

      // The message goes out again, so it meets the same limits as a new one.
      await assertWithinQuota({ ownerGUID: owner, address });

      const text = await rewindTo(thread, messageId, address);
      if (!text) {
        throw BadUserInput(COPY.nothingToRetry);
      }

      void respond(id, owner, address, text);

      const doc = await loadThread(id, owner);
      if (!doc) {
        throw NotFound('No conversation with that id');
      }
      return toResult(doc);
    },
  },

  Subscription: {
    ImageAgentThreadUpdated: {
      subscribe: withFilter(
        (_parent, _args, context?: Context) => {
          if (!context) {
            throw Unauthenticated('Authentication required');
          }
          requireOwner(context);
          return imageAgentPubSub.asyncIterableIterator(IMAGE_AGENT_THREAD_UPDATED);
        },
        (
          payload: { ImageAgentThreadUpdated?: ImageAgentThreadResult } | undefined,
          variables: { id?: string } | undefined,
          context?: Context,
        ) => {
          const thread = payload?.ImageAgentThreadUpdated;
          return Boolean(
            thread
            && thread.id === variables?.id
            && thread.ownerGUID === context?.tokenPayload?.UserGUID,
          );
        },
      ),
    },
  },

  ImageAgentMessage: {
    asset: async (parent: ImageAgentMessageResult, _: unknown, context: Context) => {
      if (!parent.assetId) {
        return null;
      }
      return context.loaders.asset.byId.load(parent.assetId);
    },
  },
};
