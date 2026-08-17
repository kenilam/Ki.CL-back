import mongoose, { Schema, type Document, Types } from 'mongoose';

import { TaxonVisualStatus } from 'server/Types/graphql.js';

export type { TaxonVisualStatus };

export type TreeOfLifeVisualScore = {
  overall: number;
  taxonMatch: number;
  pass: boolean;
};

/**
 * Flat OTOL node cache + studio fields.
 * Tree edges are nodeId-only, parent-pointer style: each node stores only its
 * own `ancestorNodeId` (set once at insert, from the OTOL arguson walk).
 * Descendants are not stored - GraphQL's `descendants` field computes them
 * live via a reverse `{ ancestorNodeId: nodeId }` lookup, DataLoader-batched.
 * Studio image via `asset` ← assetId.
 */
export interface ITreeOfLifeNode extends Document {
  /** Open Tree of Life internal node id (always present in OTOL). */
  nodeId: string;
  /** Open Tree Taxonomy id - missing on some unnamed / synthetic nodes. Not a relationship - see ancestorNodeId. */
  ottId: number | null;
  name: string | null;
  rank: string | null;
  /** Parent OTOL nodeId. Null for the root (no OTOL parent). */
  ancestorNodeId: string | null;
  /**
   * OTOL `num_tips` - tip count for the clade. `0` is a known leaf.
   * Useful at height_limit cutoffs where children are omitted but the clade continues.
   */
  numTips: number | null;
  /** Reference into `assets` collection. */
  assetId: Types.ObjectId | null;
  description: string | null;
  visualStatus: TaxonVisualStatus | null;
  /** Vision QA for the current studio asset. */
  visualScore: TreeOfLifeVisualScore | null;
  prompt: string | null;
  /**
   * How many times a plate has been generated for this taxon.
   *
   * Regeneration is driven by the review score, and some taxa simply cannot be
   * drawn well - a bacterium keeps coming back as an animal however the prompt
   * is worded. Without a ceiling those retry on every view forever. Counted
   * rather than time-boxed so the limit survives a restart.
   *
   * Internal only - not exposed on TreeOfLife GraphQL.
   */
  visualAttempts: number;
  /**
   * Why the last generation ran out of quota, when it did.
   *
   * Kept because the reason outlives the request that discovered it: a client
   * asking later still needs to know whether waiting will help.
   */
  visualExhaustion: 'REFILLS' | 'BILLING' | null;
  /** Internal only - not exposed on TreeOfLife GraphQL. */
  error: string | null;
  createdAt: Date;
  updatedAt: Date;
}

const VisualScoreSchema = new Schema<TreeOfLifeVisualScore>(
  {
    overall: { type: Number, required: true },
    taxonMatch: { type: Number, required: true },
    pass: { type: Boolean, required: true },
  },
  { _id: false },
);

const TreeOfLifeNodeSchema = new Schema<ITreeOfLifeNode>(
  {
    nodeId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    ottId: {
      type: Number,
      // Omit when unknown - a plain unique index treats every `null` as a dup.
      required: false,
    },
    name: {
      type: String,
      default: null,
    },
    rank: {
      type: String,
      default: null,
    },
    ancestorNodeId: {
      type: String,
      required: false,
      index: true,
    },
    numTips: {
      type: Number,
      required: false,
      default: null,
    },
    assetId: {
      type: Schema.Types.ObjectId,
      ref: 'Assets',
      required: false,
      index: true,
    },
    description: {
      type: String,
      default: null,
    },
    visualStatus: {
      type: String,
      enum: Object.values(TaxonVisualStatus),
      default: null,
    },
    visualScore: {
      type: VisualScoreSchema,
      default: null,
    },
    prompt: {
      type: String,
      default: null,
    },
    visualAttempts: {
      type: Number,
      default: 0,
    },
    visualExhaustion: {
      type: String,
      enum: ['REFILLS', 'BILLING', null],
      default: null,
    },
    error: {
      type: String,
      default: null,
    },
  },
  {
    timestamps: true,
    collection: 'tree-of-life',
  },
);

TreeOfLifeNodeSchema.index(
  { ottId: 1 },
  {
    name: 'ottId_unique_when_set',
    unique: true,
    partialFilterExpression: { ottId: { $type: 'number' } },
  },
);

export const TreeOfLifeNodes =
  (mongoose.models.TreeOfLifeNodes as mongoose.Model<ITreeOfLifeNode>)
  || mongoose.model<ITreeOfLifeNode>('TreeOfLifeNodes', TreeOfLifeNodeSchema);
