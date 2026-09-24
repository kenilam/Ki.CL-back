import type {
  IImageAgentThread,
  ImageAgentThreadMessage,
} from 'server/DataSources/MongoDB/ImageAgentThreads/Model.js';
import type { ImageAgentJobScore } from 'server/DataSources/MongoDB/ImageAgentJobs/Model.js';
import type {
  ImageAgentMessageKind,
  ImageAgentRejection,
  ImageAgentRole,
  ImageAgentStyle,
  ImageAgentThreadStatus,
} from 'server/Types/graphql.js';

export interface ImageAgentMessageResult {
  id: string;
  role: ImageAgentRole;
  kind: ImageAgentMessageKind;
  text: string | null;
  assetId: string | null;
  score: ImageAgentJobScore | null;
  rejection: ImageAgentRejection | null;
  exhaustion: 'REFILLS' | 'BILLING' | null;
  choices: string[];
  at: Date;
}

/** What the resolvers hand to GraphQL. `asset` is resolved from `assetId`. */
export interface ImageAgentThreadResult {
  id: string;
  ownerGUID: string;
  status: ImageAgentThreadStatus;
  brief: string | null;
  style: ImageAgentStyle | null;
  activity: string | null;
  messages: ImageAgentMessageResult[];
  createdAt: Date;
  updatedAt: Date;
}

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
