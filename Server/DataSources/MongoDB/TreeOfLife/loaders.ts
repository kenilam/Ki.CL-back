import DataLoader from 'dataloader';
import mongoose from 'mongoose';

import { TreeOfLifeNodes, type ITreeOfLifeNode } from './Model.js';

/**
 * What `.lean()` hands back, taken from the model rather than restated. Mongoose
 * 9 types this precisely, which is why the old `Record<string, unknown>` cast
 * stopped compiling.
 */
type RawTreeOfLifeNode = ITreeOfLifeNode &
  Required<{ _id: mongoose.Types.ObjectId }> & { __v: number };

export type LeanTreeOfLifeNode = {
  nodeId: string;
  ottId: number | null;
  name: string | null;
  rank: string | null;
  ancestorNodeId: string | null;
  numTips: number | null;
  assetId: string | null;
  description: string | null;
  visualStatus: string | null;
  visualScore: {
    overall: number;
    taxonMatch: number;
    pass: boolean;
  } | null;
  prompt?: string | null;
  error?: string | null;
};

/**
 * Browsing reads go to the nearest Atlas node, so London reads its own replica.
 * After a write in the same request they go to the primary, which already has it.
 */
type ReadPreference = 'nearest' | 'primary';

function toLean(doc: RawTreeOfLifeNode): LeanTreeOfLifeNode {
  const score = doc.visualScore as LeanTreeOfLifeNode['visualScore'] | undefined;
  return {
    ...(doc as Omit<LeanTreeOfLifeNode, 'assetId' | 'visualScore' | 'ancestorNodeId'>),
    ancestorNodeId:
      typeof doc.ancestorNodeId === 'string' ? doc.ancestorNodeId : null,
    assetId: doc.assetId ? String(doc.assetId) : null,
    visualScore: score
      ? {
          overall: score.overall,
          taxonMatch: score.taxonMatch,
          pass: score.pass,
        }
      : null,
  };
}

async function batchNodesByOttId(
  ottIds: readonly number[],
  read: ReadPreference,
): Promise<Array<LeanTreeOfLifeNode | null>> {
  const docs = await TreeOfLifeNodes.find({
    ottId: { $in: [...ottIds] },
  }).read(read).lean();

  const byOttId = new Map<number, LeanTreeOfLifeNode>();
  for (const doc of docs) {
    if (doc.ottId != null) {
      byOttId.set(doc.ottId, toLean(doc));
    }
  }

  return ottIds.map((ottId) => byOttId.get(ottId) ?? null);
}

async function batchNodesByNodeId(
  nodeIds: readonly string[],
  read: ReadPreference,
): Promise<Array<LeanTreeOfLifeNode | null>> {
  const docs = await TreeOfLifeNodes.find({
    nodeId: { $in: [...nodeIds] },
  }).read(read).lean();

  const byNodeId = new Map<string, LeanTreeOfLifeNode>();
  for (const doc of docs) {
    byNodeId.set(doc.nodeId, toLean(doc));
  }

  return nodeIds.map((nodeId) => byNodeId.get(nodeId) ?? null);
}

/**
 * Reverse lookup: children of each ancestorNodeId. Parent-pointer model has
 * no stored descendant list, so this is a live `$in` query, grouped back per
 * key - the one-to-many counterpart to the one-to-one loaders above.
 */
async function batchChildrenByAncestorNodeId(
  ancestorNodeIds: readonly string[],
  read: ReadPreference,
): Promise<LeanTreeOfLifeNode[][]> {
  const docs = await TreeOfLifeNodes.find({
    ancestorNodeId: { $in: [...ancestorNodeIds] },
  }).read(read).lean();

  const byAncestor = new Map<string, LeanTreeOfLifeNode[]>();
  for (const doc of docs) {
    const key = doc.ancestorNodeId as string;
    const lean = toLean(doc);
    const list = byAncestor.get(key);
    if (list) {
      list.push(lean);
    } else {
      byAncestor.set(key, [lean]);
    }
  }

  return ancestorNodeIds.map((id) => byAncestor.get(id) ?? []);
}

export type TreeOfLifeLoaders = {
  nodeByOttId: DataLoader<number, LeanTreeOfLifeNode | null>;
  nodeByNodeId: DataLoader<string, LeanTreeOfLifeNode | null>;
  childrenByAncestorNodeId: DataLoader<string, LeanTreeOfLifeNode[]>;
};

function buildTreeOfLifeLoaders(read: ReadPreference): TreeOfLifeLoaders {
  return {
    nodeByOttId: new DataLoader((ids) => batchNodesByOttId(ids, read), {
      cache: true,
    }),
    nodeByNodeId: new DataLoader((ids) => batchNodesByNodeId(ids, read), {
      cache: true,
    }),
    childrenByAncestorNodeId: new DataLoader(
      (ids) => batchChildrenByAncestorNodeId(ids, read),
      { cache: true },
    ),
  };
}

export function createTreeOfLifeLoaders(): TreeOfLifeLoaders {
  return buildTreeOfLifeLoaders('nearest');
}

/**
 * Drop cached rows after OTOL persist so the same request sees fresh edges.
 * The new loaders read the primary, since a replica may not have the write yet.
 */
export function clearTreeOfLifeLoaders(loaders: TreeOfLifeLoaders): void {
  Object.assign(loaders, buildTreeOfLifeLoaders('primary'));
}
