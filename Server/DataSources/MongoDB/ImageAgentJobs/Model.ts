import mongoose, { Schema, type Document, Types } from 'mongoose';

import type { ImageAgentStyle } from 'server/Types/graphql.js';

/**
 * Status of a drawing. Internal: the API shows the conversation, and a job is
 * the record of one drawing behind it.
 */
export const ImageAgentJobStatus = {
  Running: 'RUNNING',
  Ready: 'READY',
  Rejected: 'REJECTED',
  Error: 'ERROR',
  Exhausted: 'EXHAUSTED',
} as const;

export type ImageAgentJobStatus =
  (typeof ImageAgentJobStatus)[keyof typeof ImageAgentJobStatus];

export const ImageAgentStepKind = {
  Govern: 'GOVERN',
  Refine: 'REFINE',
  Generate: 'GENERATE',
  Score: 'SCORE',
  Retry: 'RETRY',
  Persist: 'PERSIST',
  Fail: 'FAIL',
} as const;

export type ImageAgentStepKind =
  (typeof ImageAgentStepKind)[keyof typeof ImageAgentStepKind];

export type ImageAgentJobScore = {
  relevance: number;
  quality: number;
  styleMatch: number;
  composition: number;
  overall: number;
  pass: boolean;
  suggestions: string[];
};

export type ImageAgentJobStep = {
  kind: ImageAgentStepKind;
  detail: string | null;
  at: Date;
};

/**
 * One drawing: the brief the agent settled on, the asset that came out, the
 * reviewer's score, and every step in between. Quotas count these.
 */
export interface IImageAgentJob extends Document {
  _id: Types.ObjectId;
  ownerGUID: string;
  /** The address key of the message that asked for it, for per-address quotas. */
  addressKey: string | null;
  threadId: Types.ObjectId;
  prompt: string;
  style: ImageAgentStyle;
  status: ImageAgentJobStatus;
  /** What went wrong, for the trace. The message the person sees lives on the thread. */
  error: string | null;
  imagePrompt: string | null;
  assetId: Types.ObjectId | null;
  score: ImageAgentJobScore | null;
  attempts: number;
  steps: ImageAgentJobStep[];
  createdAt: Date;
  updatedAt: Date;
}

const ScoreSchema = new Schema<ImageAgentJobScore>(
  {
    relevance: { type: Number, required: true },
    quality: { type: Number, required: true },
    styleMatch: { type: Number, required: true },
    composition: { type: Number, required: true },
    overall: { type: Number, required: true },
    pass: { type: Boolean, required: true },
    suggestions: { type: [String], default: [] },
  },
  { _id: false },
);

const StepSchema = new Schema<ImageAgentJobStep>(
  {
    kind: { type: String, required: true },
    detail: { type: String, default: null },
    at: { type: Date, required: true },
  },
  { _id: false },
);

const ImageAgentJobSchema = new Schema<IImageAgentJob>(
  {
    ownerGUID: { type: String, required: true, index: true },
    addressKey: { type: String, default: null },
    threadId: { type: Schema.Types.ObjectId, required: true, index: true },
    prompt: { type: String, required: true },
    style: { type: String, required: true },
    status: { type: String, required: true },
    error: { type: String, default: null },
    imagePrompt: { type: String, default: null },
    assetId: { type: Schema.Types.ObjectId, ref: 'Assets', default: null },
    score: { type: ScoreSchema, default: null },
    attempts: { type: Number, default: 0 },
    steps: { type: [StepSchema], default: [] },
  },
  {
    timestamps: true,
    collection: 'image_agent_jobs',
  },
);

// The quota query: a caller's drawings over the last day.
ImageAgentJobSchema.index({ ownerGUID: 1, createdAt: -1 });
ImageAgentJobSchema.index({ addressKey: 1, createdAt: -1 });

export const ImageAgentJobs =
  (mongoose.models.ImageAgentJobs as mongoose.Model<IImageAgentJob>)
  || mongoose.model<IImageAgentJob>('ImageAgentJobs', ImageAgentJobSchema);

export { ScoreSchema as ImageAgentScoreSchema };
