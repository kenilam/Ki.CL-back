import { Schema } from 'mongoose';

import type { ImageAgentScore } from 'server/Types/graphql.js';

export type ImageAgentJobScore = Omit<ImageAgentScore, '__typename'>;

export const ImageAgentScoreSchema = new Schema<ImageAgentJobScore>(
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
