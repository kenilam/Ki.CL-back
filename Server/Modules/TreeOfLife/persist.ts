import {
  TreeOfLifeNodes,
  type ITreeOfLifeNode,
} from 'server/DataSources/MongoDB/TreeOfLife/Model.js';
import {
  argusonName,
  fetchOtolSubtreeResult,
  type ArgusonNode,
} from './otol.js';

/** Mongo's duplicate-key error code. */
const DUPLICATE_KEY = 11000;

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
  // Preserve null rank - never invent a placeholder.
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
 * Collapse repeats of one node into a single entry, keeping whatever is known.
 *
 * A batch can name the same node twice - a spine starts at its subject, and
 * two lineages in one response share every ancestor above their split. Two
 * inserts for one id is a duplicate-key error, so they are merged before any
 * of it reaches Mongo.
 */
function mergeByNodeId(flat: FlatNode[]): FlatNode[] {
  const merged = new Map<string, FlatNode>();

  for (const node of flat) {
    const prev = merged.get(node.nodeId);

    if (!prev) {
      merged.set(node.nodeId, { ...node });
      continue;
    }

    prev.ottId ??= node.ottId;
    prev.name ??= node.name;
    prev.rank ??= node.rank;
    prev.ancestorNodeId ??= node.ancestorNodeId;

    if (node.numTips != null && (prev.numTips == null || node.numTips > prev.numTips)) {
      prev.numTips = node.numTips;
    }
  }

  return [...merged.values()];
}

/**
 * Persist a flat node list with a single bulkWrite.
 * - Upsert, so a node another writer created in the meantime is filled, not duplicated
 * - Fill null ancestorNodeId once when discovered, never overwrite
 * Relationships are nodeId-only, parent-pointer style: each node stores only
 * its own ancestorNodeId; descendants are reverse-looked-up by query.
 *
 * Reading which nodes exist and then inserting the rest is not one operation,
 * and lineage spines are written concurrently for taxa that share ancestors -
 * so two writers routinely decided the same node was missing and both inserted
 * it. Upserting makes the write idempotent, which is what it always needed to
 * be: the second writer fills the row the first created instead of colliding
 * with it.
 */
async function writeFlatNodes(input: FlatNode[]): Promise<void> {
  const flat = mergeByNodeId(input);

  if (!flat.length) {
    return;
  }

  const nodeIds = flat.map((node) => node.nodeId);
  /*
   * Every field the fill-only rules below consult has to be selected. A field
   * left out reads as `undefined`, which those rules cannot tell from "not set
   * yet" - so an unselected `name` or `rank` would be overwritten on every
   * pass rather than filled once.
   */
  const existing = await TreeOfLifeNodes.find({ nodeId: { $in: nodeIds } })
    .select('nodeId ancestorNodeId numTips name rank ottId')
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
          name?: string | null;
          rank?: string | null;
          ottId?: number | null;
        }
      | undefined;

    if (!prev) {
      ops.push({
        updateOne: {
          filter: { nodeId: node.nodeId },
          update: {
            $set: {
              ...(node.ottId != null ? { ottId: node.ottId } : {}),
              name: node.name,
              rank: node.rank,
              ...(node.ancestorNodeId != null
                ? { ancestorNodeId: node.ancestorNodeId }
                : {}),
              numTips: node.numTips,
            },
            // Only when this write is the one that creates the row - a plate
            // and its review belong to the pipeline, not to the OTOL import,
            // and must not be reset by a later pass over the same node.
            $setOnInsert: {
              nodeId: node.nodeId,
              assetId: null,
              description: null,
              visualStatus: null,
              visualScore: null,
              prompt: null,
              visualAttempts: 0,
              error: null,
            },
          },
          upsert: true,
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
    /*
     * Fill a missing name, never replace one.
     *
     * A lineage row has no `descendant_name_list`, so an unnamed `mrcaott…`
     * node arrives from the spine with nothing to call it. The subtree that
     * covers it later does know a name, and without this it would have no way
     * to say so - the node would stay nameless, and a nameless node draws no
     * label at all.
     */
    if (node.name != null && prev.name == null) {
      $set.name = node.name;
    }
    if (node.ottId != null && prev.ottId == null) {
      $set.ottId = node.ottId;
    }
    if (node.rank !== undefined && prev.rank == null) {
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

  await bulkWriteTolerantOfRaces(ops);
}

/** A duplicate-key error, from anywhere inside a bulk write. */
function isDuplicateKeyError(error: unknown): boolean {
  const code = (error as { code?: number })?.code;

  if (code === DUPLICATE_KEY) {
    return true;
  }

  const writeErrors = (error as { writeErrors?: Array<{ code?: number }> })
    ?.writeErrors;

  return Array.isArray(writeErrors)
    && writeErrors.length > 0
    && writeErrors.every((entry) => entry.code === DUPLICATE_KEY);
}

/**
 * Run the batch, and run it once more if a concurrent writer beat us to a row.
 *
 * Upserting is what stopped this happening on every request, but it is not a
 * guarantee: matching and inserting are not one atomic step against a unique
 * index, so two upserts for the same node can still collide. The loser's work
 * is not lost - by the time it retries the row exists, so the same operation
 * becomes an ordinary update and succeeds.
 *
 * Only duplicate-key failures are retried. Anything else is a real error and
 * is left to propagate; swallowing those is how a write silently stops
 * happening.
 */
async function bulkWriteTolerantOfRaces(
  ops: Parameters<typeof TreeOfLifeNodes.bulkWrite>[0],
): Promise<void> {
  try {
    await TreeOfLifeNodes.bulkWrite(ops, { ordered: false });
  } catch (error) {
    if (!isDuplicateKeyError(error)) {
      throw error;
    }

    await TreeOfLifeNodes.bulkWrite(ops, { ordered: false });
  }
}

/** Walk OTOL arguson once, then persist the whole subtree. */
export async function persistArgusonTree(
  root: ArgusonNode,
  ancestorNodeId: string | null = null,
): Promise<void> {
  const flat: FlatNode[] = [];
  flattenArguson(root, ancestorNodeId, flat);
  await writeFlatNodes(flat);
}

/**
 * Persist a node's rootward spine, so the chain from it reaches the origin.
 *
 * `lineage` runs parent first → root, so each entry's ancestor is the one after
 * it and the last entry - the origin of life - has none. That final null is the
 * only one this writes: every other node comes out with a real parent, which is
 * what makes a stored null mean "root" again instead of "this is as far as some
 * earlier fetch happened to reach".
 */
export async function persistLineageSpine(
  nodeId: string,
  lineage: ArgusonNode[],
): Promise<void> {
  if (!lineage.length) {
    return;
  }

  const flat: FlatNode[] = [];

  /*
   * The subject itself, carrying nothing but the parent pointer it was missing.
   * Everything else about it was written by the subtree that came before, and
   * the writer only ever fills nulls, so the nulls here overwrite nothing.
   */
  flat.push({
    nodeId,
    ottId: null,
    name: null,
    rank: null,
    ancestorNodeId: lineage[0].node_id?.trim() ?? null,
    numTips: null,
  });

  lineage.forEach((node, index) => {
    const id = node.node_id?.trim();

    if (!id) {
      return;
    }

    flat.push({
      nodeId: id,
      ottId: node.taxon?.ott_id ?? null,
      name: argusonName(node),
      rank: node.taxon?.rank ?? null,
      ancestorNodeId: lineage[index + 1]?.node_id?.trim() ?? null,
      numTips: typeof node.num_tips === 'number' ? node.num_tips : null,
    });
  });

  await writeFlatNodes(flat);
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
