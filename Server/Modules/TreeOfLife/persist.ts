import {
  TreeOfLifeNodes,
  type ITreeOfLifeNode,
} from 'server/DataSources/MongoDB/TreeOfLife/Model.js';
import {
  argusonName,
  fetchOtolSubtreeResult,
  type ArgusonNode,
} from './otol.js';

type FlatNode = {
  nodeId: string;
  ottId: number | null;
  name: string | null;
  rank: string | null;
  ancestorNodeId: string | null;
  numTips: number | null;
};

function flattenArguson(
  node: ArgusonNode,
  ancestorNodeId: string | null,
  out: FlatNode[],
): void {
  const nodeId = node.node_id?.trim();
  if (!nodeId) {
    return;
  }

  const ottId = node.taxon?.ott_id ?? null;
  const children = node.children ?? [];
  const numTips = typeof node.num_tips === 'number' ? node.num_tips : null;
  // Preserve null rank — never invent a placeholder.
  const rank = node.taxon?.rank ?? null;

  out.push({
    nodeId,
    ottId,
    name: argusonName(node),
    rank,
    ancestorNodeId,
    numTips,
  });

  for (const child of children) {
    flattenArguson(child, nodeId, out);
  }
}

/**
 * Walk OTOL arguson once, then persist with a single bulkWrite.
 * - Insert only when nodeId is new
 * - Fill null ancestorNodeId once when discovered, never overwrite
 * Relationships are nodeId-only, parent-pointer style: each node stores only
 * its own ancestorNodeId; descendants are reverse-looked-up by query.
 */
export async function persistArgusonTree(
  root: ArgusonNode,
  ancestorNodeId: string | null = null,
): Promise<void> {
  const flat: FlatNode[] = [];
  flattenArguson(root, ancestorNodeId, flat);
  if (!flat.length) {
    return;
  }

  const nodeIds = flat.map((node) => node.nodeId);
  const existing = await TreeOfLifeNodes.find({ nodeId: { $in: nodeIds } })
    .select('nodeId ancestorNodeId numTips')
    .lean();
  const existingByNodeId = new Map(
    existing.map((doc) => [doc.nodeId, doc] as const),
  );

  const ops: Parameters<typeof TreeOfLifeNodes.bulkWrite>[0] = [];

  for (const node of flat) {
    const prev = existingByNodeId.get(node.nodeId) as
      | {
          nodeId: string;
          ancestorNodeId?: string | null;
          numTips?: number | null;
        }
      | undefined;

    if (!prev) {
      ops.push({
        insertOne: {
          document: {
            nodeId: node.nodeId,
            ...(node.ottId != null ? { ottId: node.ottId } : {}),
            name: node.name,
            rank: node.rank,
            ...(node.ancestorNodeId != null
              ? { ancestorNodeId: node.ancestorNodeId }
              : {}),
            numTips: node.numTips,
            assetId: null,
            description: null,
            visualStatus: null,
            visualScore: null,
            prompt: null,
            error: null,
          },
        },
      });
      continue;
    }

    const update: Record<string, unknown> = {};
    const $set: Record<string, unknown> = {};

    const prevAncestor =
      typeof prev.ancestorNodeId === 'string' ? prev.ancestorNodeId : null;

    if (node.ancestorNodeId != null && prevAncestor == null) {
      $set.ancestorNodeId = node.ancestorNodeId;
    }
    if (
      node.numTips != null
      && (prev.numTips == null || node.numTips > prev.numTips)
    ) {
      $set.numTips = node.numTips;
    }
    if (node.rank !== undefined && (prev as { rank?: string | null }).rank == null) {
      // Only fill missing rank; keep explicit null as null.
      if (node.rank != null) {
        $set.rank = node.rank;
      }
    }
    if (Object.keys($set).length) {
      update.$set = $set;
    }
    if (Object.keys(update).length) {
      ops.push({
        updateOne: {
          filter: { nodeId: node.nodeId },
          update,
        },
      });
    }
  }

  if (!ops.length) {
    return;
  }

  await TreeOfLifeNodes.bulkWrite(ops, { ordered: false });
}

export async function findNodeByOttId(ottId: number) {
  return TreeOfLifeNodes.findOne({ ottId }).lean();
}

export async function findNodeByNodeId(nodeId: string) {
  return TreeOfLifeNodes.findOne({ nodeId }).lean();
}

export async function ensureTreeOfLifeNodeByOttId(
  ottId: number,
): Promise<ITreeOfLifeNode | null> {
  const existing = await TreeOfLifeNodes.findOne({ ottId });
  if (existing) {
    return existing;
  }

  const result = await fetchOtolSubtreeResult({ ottId, heightLimit: 1 });
  if (!result.ok) {
    return null;
  }

  await persistArgusonTree(result.arguson);
  return TreeOfLifeNodes.findOne({ ottId });
}
