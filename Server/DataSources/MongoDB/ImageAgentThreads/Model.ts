import mongoose, { Schema, type Document, Types } from 'mongoose';

import type {
  ImageAgentMessageKind,
  ImageAgentRejection,
  ImageAgentRole,
  ImageAgentStyle,
  ImageAgentThreadStatus,
} from 'server/Types/graphql.js';
import {
  ImageAgentScoreSchema,
  type ImageAgentJobScore,
} from 'server/DataSources/MongoDB/ImageAgentJobs/Model.js';

export type ImageAgentThreadMessage = {
  id: string;
  role: ImageAgentRole;
  kind: ImageAgentMessageKind;
  text: string | null;
  /** The drawing behind an IMAGE or PROGRESS message. */
  jobId: Types.ObjectId | null;
  assetId: Types.ObjectId | null;
  score: ImageAgentJobScore | null;
  rejection: ImageAgentRejection | null;
  exhaustion: 'REFILLS' | 'BILLING' | null;
  /** Replies offered with a QUESTION, sent as text when picked. */
  choices?: string[];
  /**
   * Set when the person went back to an earlier message: this one came after
   * it. Hidden from the conversation, but kept, because the quotas count
   * what was sent and answered, not what is still on screen.
   */
  removedAt?: Date | null;
  /** The sender's address key, on the person's messages, for per-address quotas. */
  addressKey?: string | null;
  at: Date;
};

/**
 * One conversation with the agent: what the person said, what the agent
 * asked or drew, and where the agent is right now.
 *
 * `brief` and `style` are the agent's current understanding of the picture,
 * carried forward so "make it at night" can build on the last drawing.
 */
export interface IImageAgentThread extends Document {
  _id: Types.ObjectId;
  ownerGUID: string;
  status: ImageAgentThreadStatus;
  brief: string | null;
  style: ImageAgentStyle | null;
  /** Clarifying questions asked so far, so the agent cannot ask forever. */
  asked: number;
  /** The step the agent is on while THINKING; null otherwise. */
  activity: string | null;
  messages: ImageAgentThreadMessage[];
  createdAt: Date;
  updatedAt: Date;
}

const MessageSchema = new Schema<ImageAgentThreadMessage>(
  {
    id: { type: String, required: true },
    role: { type: String, required: true },
    kind: { type: String, required: true },
    text: { type: String, default: null },
    jobId: { type: Schema.Types.ObjectId, default: null },
    assetId: { type: Schema.Types.ObjectId, ref: 'Assets', default: null },
    score: { type: ImageAgentScoreSchema, default: null },
    rejection: { type: String, default: null },
    exhaustion: { type: String, default: null },
    choices: { type: [String], default: [] },
    removedAt: { type: Date, default: null },
    addressKey: { type: String, default: null },
    at: { type: Date, required: true },
  },
  { _id: false },
);

const ImageAgentThreadSchema = new Schema<IImageAgentThread>(
  {
    ownerGUID: { type: String, required: true, index: true },
    status: { type: String, required: true },
    brief: { type: String, default: null },
    style: { type: String, default: null },
    asked: { type: Number, default: 0 },
    activity: { type: String, default: null },
    messages: { type: [MessageSchema], default: [] },
  },
  {
    timestamps: true,
    collection: 'image_agent_threads',
  },
);

ImageAgentThreadSchema.index({ ownerGUID: 1, updatedAt: -1 });
// The per-address and global message quotas.
ImageAgentThreadSchema.index({ 'messages.addressKey': 1, updatedAt: -1 });
ImageAgentThreadSchema.index({ updatedAt: -1 });

export const ImageAgentThreads =
  (mongoose.models.ImageAgentThreads as mongoose.Model<IImageAgentThread>)
  || mongoose.model<IImageAgentThread>('ImageAgentThreads', ImageAgentThreadSchema);
