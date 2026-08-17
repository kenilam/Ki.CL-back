import { validate } from 'server/Helpers/Validation/validate.js';
import { BadUserInput, NotFound } from 'server/Errors/index.js';
import type { Context } from 'server/Context/index.js';
import {
  TreeOfLifeSubtreeSchema,
  TreeOfLifeSubtreesSchema,
} from './validation.js';
import {
  resolveSubtreeRoots,
  type SubtreeKey,
} from './resolveSubtree.js';

function throwOtolMiss(miss: {
  status: number;
  message?: string;
}): never {
  if (miss.status === 0) {
    throw BadUserInput(miss.message ?? 'Failed to reach Open Tree of Life');
  }
  if (miss.status === 400 || miss.status === 404) {
    throw NotFound(
      miss.message ?? 'Tree of Life subtree not found for the given id',
    );
  }
  throw BadUserInput(
    miss.message ?? `Open Tree of Life request failed (${miss.status})`,
  );
}

/**
 * One OTOL subtree call (heightLimit deep) → persist flat rows → return root doc.
 * GraphQL `descendants` then DataLoader-stitches children via a live reverse
 * lookup (`{ ancestorNodeId: nodeId }`, batched `$in`) - parent-pointer model,
 * nothing stored forward on the parent.
 * Batch variant shares Mongo warm-path + DataLoader `$in` loads.
 */
export default {
  Query: {
    TreeOfLifeSubtree: async (
      _: unknown,
      args: { ottId?: number | null; nodeId?: string | null; heightLimit?: number | null },
      context: Context,
    ) => {
      const input = validate(TreeOfLifeSubtreeSchema, args);
      const key: SubtreeKey = { ottId: input.ottId, nodeId: input.nodeId };
      const { roots, misses } = await resolveSubtreeRoots(
        [key],
        input.heightLimit,
        context,
      );
      const doc = roots[0];
      if (doc) {
        return doc;
      }

      const miss = misses[0];
      if (miss?.cached) {
        return miss.cached;
      }
      if (miss) {
        throwOtolMiss(miss);
      }
      throw NotFound('Tree of Life subtree not found for the given id');
    },

    TreeOfLifeSubtrees: async (
      _: unknown,
      args: {
        ottIds?: number[] | null;
        nodeIds?: string[] | null;
        heightLimit?: number | null;
      },
      context: Context,
    ) => {
      const input = validate(TreeOfLifeSubtreesSchema, args);
      const keys: SubtreeKey[] = [
        ...input.ottIds.map((ottId) => ({
          ottId,
          nodeId: null as string | null,
        })),
        ...input.nodeIds.map((nodeId) => ({
          ottId: null as number | null,
          nodeId,
        })),
      ];

      const { roots } = await resolveSubtreeRoots(
        keys,
        input.heightLimit,
        context,
      );

      return roots;
    },
  },

  TreeOfLifeNode: {
    ancestor: async (
      parent: { ancestorNodeId?: string | null },
      _: unknown,
      context: Context,
    ) => {
      if (parent.ancestorNodeId == null) {
        return null;
      }
      return context.loaders.treeOfLife.nodeByNodeId.load(
        parent.ancestorNodeId,
      );
    },

    descendants: async (
      parent: { nodeId: string },
      _: unknown,
      context: Context,
    ) => context.loaders.treeOfLife.childrenByAncestorNodeId.load(
      parent.nodeId,
    ),

    assetId: (parent: { assetId?: unknown }) => (
      parent.assetId != null ? String(parent.assetId) : null
    ),

    asset: async (
      parent: { assetId?: unknown },
      _: unknown,
      context: Context,
    ) => {
      if (parent.assetId == null) {
        return null;
      }
      return context.loaders.asset.byId.load(String(parent.assetId));
    },
  },
};
