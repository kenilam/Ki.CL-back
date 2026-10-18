import type {
  IImageAgentThread,
  ImageAgentThreadMessage,
} from 'server/DataSources/MongoDB/ImageAgentThreads/Model.js';
import type { ImageAgentMessage, ImageAgentThread } from 'server/Types/graphql.js';

/** `asset` is resolved from `assetId`. Dates are Mongo's, not the branded scalar. */
export type ImageAgentMessageResult = Omit<ImageAgentMessage, '__typename' | 'asset' | 'at'> & {
  at: Date;
};

/** What the resolvers hand to GraphQL. */
export type ImageAgentThreadResult = Omit<
  ImageAgentThread,
  '__typename' | 'messages' | 'createdAt' | 'updatedAt'
> & {
  ownerGUID: string;
  messages: ImageAgentMessageResult[];
  createdAt: Date;
  updatedAt: Date;
};

/** A `.lean()` read of the thread: the fields, without the Mongoose document. */
export type LeanImageAgentThread = Pick<
  IImageAgentThread,
  | 'ownerGUID'
  | 'status'
  | 'brief'
  | 'style'
  | 'asked'
  | 'activity'
  | 'messages'
  | 'createdAt'
  | 'updatedAt'
> & {
  _id: { toString(): string };
};

function toMessage(message: ImageAgentThreadMessage): ImageAgentMessageResult {
  return {
    id: message.id,
    role: message.role,
    kind: message.kind,
    text: message.text ?? null,
    assetId: message.assetId != null ? String(message.assetId) : null,
    score: message.score ?? null,
    rejection: message.rejection ?? null,
    exhaustion: message.exhaustion ?? null,
    choices: message.choices ?? [],
    at: message.at,
  };
}

/** The messages still in the conversation, without those gone back over. */
export function visible<T extends Pick<ImageAgentThreadMessage, 'removedAt'>>(messages: T[]): T[] {
  return messages.filter((message) => !message.removedAt);
}

export function toResult(doc: LeanImageAgentThread): ImageAgentThreadResult {
  return {
    id: String(doc._id),
    ownerGUID: doc.ownerGUID,
    status: doc.status,
    brief: doc.brief ?? null,
    style: doc.style ?? null,
    activity: doc.activity ?? null,
    messages: visible(doc.messages ?? []).map(toMessage),
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}
