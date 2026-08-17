import type { Context } from 'server/Context/index.js';
import {
  clearTreeOfLifeLoaders,
  type LeanTreeOfLifeNode,
} from 'server/DataSources/MongoDB/TreeOfLife/loaders.js';
import { fetchOtolNodeLineage, fetchOtolSubtreeResult } from './otol.js';
import { persistArgusonTree, persistLineageSpine } from './persist.js';
import { ROOT_OTT_ID } from './validation.js';

const ROOT_NODE_ID = `ott${ROOT_OTT_ID}`;

export type SubtreeKey = {
  ottId: number | null;
  nodeId: string | null;
};

/**
 * Mongo is warm when we already know the OTOL edge set for this root:
 * - true leaf (`numTips === 0`), or
 * - prior persist wrote at least one child (reverse-looked-up by ancestorNodeId).
 * Empty kids + unknown/positive tip count still needs OTOL (height cutoffs).
 */
export async function isMongoWarm(
  doc: Pick<LeanTreeOfLifeNode, 'nodeId' | 'numTips'> | null | undefined,
  context: Context,
): Promise<boolean> {
  if (!doc) {
    return false;
  }
  if (doc.numTips === 0) {
    return true;
  }
  const children = await context.loaders.treeOfLife.childrenByAncestorNodeId.load(
    doc.nodeId,
  );
  return children.length > 0;
}

async function loadKey(
  key: SubtreeKey,
  context: Context,
): Promise<LeanTreeOfLifeNode | null> {
  if (key.ottId != null) {
    return context.loaders.treeOfLife.nodeByOttId.load(key.ottId);
  }
  if (key.nodeId != null) {
    return context.loaders.treeOfLife.nodeByNodeId.load(key.nodeId);
  }
  return null;
}

async function loadKeys(
  keys: SubtreeKey[],
  context: Context,
): Promise<Array<LeanTreeOfLifeNode | null>> {
  const ottIds = keys
    .map((key) => key.ottId)
    .filter((id): id is number => id != null);
  const nodeIds = keys
    .map((key) => key.nodeId)
    .filter((id): id is string => id != null);

  // One Mongo `$in` per id space via DataLoader batching.
  await Promise.all([
    ottIds.length
      ? context.loaders.treeOfLife.nodeByOttId.loadMany(ottIds)
      : Promise.resolve([]),
    nodeIds.length
      ? context.loaders.treeOfLife.nodeByNodeId.loadMany(nodeIds)
      : Promise.resolve([]),
  ]);

  return Promise.all(keys.map((key) => loadKey(key, context)));
}

export type OtolMiss = {
  key: SubtreeKey;
  status: number;
  message?: string;
  cached: LeanTreeOfLifeNode | null;
};

/**
 * Resolve many subtree roots: Mongo warm-path first, OTOL only for cold keys,
 * then DataLoader reload (after cache clear) so GraphQL can stitch descendants.
 */
export async function resolveSubtreeRoots(
  keys: SubtreeKey[],
  heightLimit: number,
  context: Context,
): Promise<{
  roots: Array<LeanTreeOfLifeNode | null>;
  misses: OtolMiss[];
}> {
  if (!keys.length) {
    return { roots: [], misses: [] };
  }

  const existing = await loadKeys(keys, context);
  const warmth = await Promise.all(
    existing.map((doc) => isMongoWarm(doc, context)),
  );
  const coldIndexes: number[] = [];
  for (let i = 0; i < keys.length; i += 1) {
    if (!warmth[i]) {
      coldIndexes.push(i);
    }
  }

  const misses: OtolMiss[] = [];

  if (coldIndexes.length) {
    const otolResults = await Promise.all(
      coldIndexes.map(async (index) => {
        const key = keys[index];
        const result = await fetchOtolSubtreeResult({
          ottId: key.ottId,
          nodeId: key.nodeId,
          heightLimit,
        });
        return { index, key, result, cached: existing[index] };
      }),
    );

    const persisted = otolResults.filter((entry) => entry.result.ok);
    await Promise.all(
      persisted.map((entry) => {
        if (!entry.result.ok) {
          return Promise.resolve();
        }
        return persistArgusonTree(entry.result.arguson);
      }),
    );

    for (const entry of otolResults) {
      if (!entry.result.ok) {
        misses.push({
          key: entry.key,
          status: entry.result.status,
          message: entry.result.message,
          cached: entry.cached,
        });
      }
    }

    if (persisted.length) {
      // Persist may have filled previously-null DataLoader slots.
      clearTreeOfLifeLoaders(context.loaders.treeOfLife);
    }

    /*
     * A subtree describes only what hangs below its root, so the root itself
     * comes out of the fetch with no known parent. Left there it is stored as
     * `ancestorNodeId: null`, which is the same thing the origin of life
     * stores - and clients walking rootward stop at it, believing they have
     * arrived. Fetching the spine is what keeps that null meaning one thing.
     *
     * Only for roots that actually lack a parent: a node reached by walking
     * down from somewhere already has one, and the great majority do.
     */
    const spineCandidates = (await loadKeys(
      persisted.map((entry) => keys[entry.index]),
      context,
    )).filter(
      (doc): doc is LeanTreeOfLifeNode =>
        doc != null
        && doc.nodeId !== ROOT_NODE_ID
        && doc.ancestorNodeId == null,
    );

    if (spineCandidates.length) {
      await Promise.all(
        spineCandidates.map(async (doc) => {
          const lineage = await fetchOtolNodeLineage({ nodeId: doc.nodeId });

          if (!lineage.ok) {
            return;
          }

          await persistLineageSpine(doc.nodeId, lineage.lineage);
        }),
      );

      clearTreeOfLifeLoaders(context.loaders.treeOfLife);
    }
  }

  const roots = await loadKeys(keys, context);
  return { roots, misses };
}
