import * as v from 'valibot';

/** Cellular organisms - Open Tree of Life synthetic root. */
export const ROOT_OTT_ID = 93302;

const MAX_HEIGHT_LIMIT = 3;
/** Caps auto / multi-expand batches (keep in sync with client AUTO_BATCH_SIZE). */
export const MAX_SUBTREES_BATCH = 32;

const HeightLimitSchema = v.optional(
  v.nullable(
    v.pipe(v.number(), v.integer(), v.minValue(1), v.maxValue(MAX_HEIGHT_LIMIT)),
  ),
  MAX_HEIGHT_LIMIT,
);

export const TreeOfLifeSubtreeSchema = v.pipe(
  v.object({
    ottId: v.optional(v.nullable(v.pipe(v.number(), v.integer(), v.minValue(1)))),
    nodeId: v.optional(v.nullable(v.pipe(v.string(), v.minLength(1)))),
    heightLimit: HeightLimitSchema,
  }),
  v.transform((input) => {
    const nodeId = input.nodeId?.trim() || null;
    const heightLimit = input.heightLimit ?? MAX_HEIGHT_LIMIT;

    // nodeId wins when present; otherwise ottId defaults to the tree root.
    if (nodeId) {
      return { ottId: null as number | null, nodeId, heightLimit };
    }

    return {
      ottId: input.ottId ?? ROOT_OTT_ID,
      nodeId: null as string | null,
      heightLimit,
    };
  }),
);

export const TreeOfLifeSubtreesSchema = v.pipe(
  v.object({
    ottIds: v.optional(
      v.nullable(
        v.pipe(
          v.array(v.pipe(v.number(), v.integer(), v.minValue(1))),
          v.maxLength(MAX_SUBTREES_BATCH),
        ),
      ),
    ),
    nodeIds: v.optional(
      v.nullable(
        v.pipe(
          v.array(v.pipe(v.string(), v.minLength(1))),
          v.maxLength(MAX_SUBTREES_BATCH),
        ),
      ),
    ),
    heightLimit: HeightLimitSchema,
  }),
  v.check(
    (input) => (
      (input.ottIds?.length ?? 0) + (input.nodeIds?.length ?? 0) > 0
    ),
    'Provide at least one ottId or nodeId',
  ),
  v.check(
    (input) => (
      (input.ottIds?.length ?? 0) + (input.nodeIds?.length ?? 0)
      <= MAX_SUBTREES_BATCH
    ),
    `At most ${MAX_SUBTREES_BATCH} subtree roots per request`,
  ),
  v.transform((input) => {
    const ottIds = [...new Set(input.ottIds ?? [])];
    const nodeIds = [...new Set(
      (input.nodeIds ?? []).map((id) => id.trim()).filter(Boolean),
    )];
    return {
      ottIds,
      nodeIds,
      heightLimit: input.heightLimit ?? MAX_HEIGHT_LIMIT,
    };
  }),
);
