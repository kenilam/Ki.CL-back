const OTOL_SUBTREE_URL = 'https://api.opentreeoflife.org/v3/tree_of_life/subtree';
const OTOL_TAXON_INFO_URL = 'https://api.opentreeoflife.org/v3/taxonomy/taxon_info';
const OTOL_NODE_INFO_URL = 'https://api.opentreeoflife.org/v3/tree_of_life/node_info';
const OTOL_AUTOCOMPLETE_URL =
  'https://api.opentreeoflife.org/v3/tnrs/autocomplete_name';

export interface ArgusonTaxon {
  name?: string;
  unique_name?: string;
  rank?: string;
  ott_id?: number;
}

/** One ancestor from OTOL `taxonomy/taxon_info` (`include_lineage: true`). */
export type OtolLineageTaxon = {
  name: string;
  uniqueName: string | null;
  rank: string | null;
  ottId: number | null;
};

export type OtolTaxonInfo = {
  name: string;
  uniqueName: string | null;
  rank: string | null;
  ottId: number;
  /** Rootward ancestors (parent first → life). */
  lineage: OtolLineageTaxon[];
};

export interface ArgusonNode {
  node_id?: string;
  num_tips?: number;
  taxon?: ArgusonTaxon;
  children?: ArgusonNode[];
  descendant_name_list?: string[];
}

export function argusonName(node: ArgusonNode): string | null {
  const taxon = node.taxon;
  return (
    taxon?.unique_name
    ?? taxon?.name
    ?? node.descendant_name_list?.[0]
    ?? null
  );
}

export type OtolFetchResult =
  | { ok: true; arguson: ArgusonNode }
  | { ok: false; status: number; message?: string };

export async function fetchOtolSubtreeResult(options: {
  ottId?: number | null;
  nodeId?: string | null;
  heightLimit: number;
}): Promise<OtolFetchResult> {
  const body: Record<string, unknown> = {
    format: 'arguson',
    height_limit: options.heightLimit,
  };

  if (options.ottId != null) {
    body.ott_id = options.ottId;
  } else if (options.nodeId != null) {
    body.node_id = options.nodeId;
  }

  let response: Response;
  try {
    response = await fetch(OTOL_SUBTREE_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
  } catch {
    return { ok: false, status: 0, message: 'Failed to reach Open Tree of Life' };
  }

  if (!response.ok) {
    let message: string | undefined;
    try {
      const json = (await response.json()) as { message?: string };
      message = json.message;
    } catch {
      // ignore parse errors
    }
    return { ok: false, status: response.status, message };
  }

  const json = (await response.json()) as {
    arguson?: ArgusonNode;
    message?: string;
  };

  if (!json.arguson?.node_id) {
    return {
      ok: false,
      status: 404,
      message: json.message ?? 'Tree of Life subtree not found',
    };
  }

  return { ok: true, arguson: json.arguson };
}

export type OtolLineageResult =
  | { ok: true; lineage: ArgusonNode[] }
  | { ok: false; status: number; message?: string };

/**
 * A node's rootward spine in the synthetic tree - parent first, ending at the
 * origin of life.
 *
 * `subtree` only ever describes what hangs *below* the node it was asked for,
 * so persisting one leaves its top with no known parent. That is
 * indistinguishable, once stored, from the one node that genuinely has none -
 * and a genus was being served to clients as the root of all life. This is what
 * closes the gap.
 *
 * `tree_of_life/node_info` rather than `taxonomy/taxon_info`: the taxonomy
 * knows only named ranks, while the synthetic tree strings unnamed `mrcaott…`
 * nodes between them. A taxonomy lineage would skip those and the spine would
 * not join up.
 */
export async function fetchOtolNodeLineage(options: {
  ottId?: number | null;
  nodeId?: string | null;
}): Promise<OtolLineageResult> {
  const body: Record<string, unknown> = { include_lineage: true };

  if (options.ottId != null) {
    body.ott_id = options.ottId;
  } else if (options.nodeId != null) {
    body.node_id = options.nodeId;
  } else {
    return { ok: false, status: 400, message: 'No node given' };
  }

  let response: Response;
  try {
    response = await fetch(OTOL_NODE_INFO_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
  } catch {
    return { ok: false, status: 0, message: 'Failed to reach Open Tree of Life' };
  }

  if (!response.ok) {
    return { ok: false, status: response.status };
  }

  const json = (await response.json()) as {
    lineage?: unknown;
    message?: string;
  };

  if (!Array.isArray(json.lineage)) {
    return {
      ok: false,
      status: 404,
      message: json.message ?? 'Tree of Life lineage not found',
    };
  }

  const lineage = (json.lineage as ArgusonNode[]).filter((node) =>
    Boolean(node?.node_id),
  );

  return { ok: true, lineage };
}

function asLineageTaxon(raw: unknown): OtolLineageTaxon | null {
  if (!raw || typeof raw !== 'object') {
    return null;
  }
  const row = raw as Record<string, unknown>;
  const name = typeof row.name === 'string' ? row.name.trim() : '';
  if (!name) {
    return null;
  }
  return {
    name,
    uniqueName: typeof row.unique_name === 'string' ? row.unique_name.trim() : null,
    rank: typeof row.rank === 'string' ? row.rank.trim() : null,
    ottId: typeof row.ott_id === 'number' ? row.ott_id : null,
  };
}

/**
 * OTOL taxonomy lookup with full parent lineage (used to ground TaxonVisual).
 */
export async function fetchOtolTaxonInfo(
  ottId: number,
): Promise<OtolTaxonInfo | null> {
  let response: Response;
  try {
    response = await fetch(OTOL_TAXON_INFO_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ott_id: ottId,
        include_lineage: true,
      }),
    });
  } catch {
    return null;
  }

  if (!response.ok) {
    return null;
  }

  let json: Record<string, unknown>;
  try {
    json = (await response.json()) as Record<string, unknown>;
  } catch {
    return null;
  }

  const name = typeof json.name === 'string' ? json.name.trim() : '';
  const resolvedOttId = typeof json.ott_id === 'number' ? json.ott_id : ottId;
  if (!name) {
    return null;
  }

  const lineageRaw = Array.isArray(json.lineage) ? json.lineage : [];
  const lineage = lineageRaw
    .map(asLineageTaxon)
    .filter((row): row is OtolLineageTaxon => row != null);

  return {
    name,
    uniqueName: typeof json.unique_name === 'string' ? json.unique_name.trim() : null,
    rank: typeof json.rank === 'string' ? json.rank.trim() : null,
    ottId: resolvedOttId,
    lineage,
  };
}

/** Leaf → root names for prompts / domain gates (includes the query taxon). */
export function lineageNamesForTaxon(info: OtolTaxonInfo): string[] {
  return [info.name, ...info.lineage.map((row) => row.name)];
}

/** Compact path string, e.g. `Rhodelphis marinus › Rhodelphis › … › Eukaryota`. */
export function formatLineagePath(info: OtolTaxonInfo, maxDepth = 12): string {
  const names = lineageNamesForTaxon(info).slice(0, maxDepth);
  return names.join(' › ');
}

/**
 * A name match from OTOL's taxonomic name resolution service.
 *
 * `nodeId` is deliberately absent: TNRS answers about *taxa*, and a taxon only
 * acquires a synthetic-tree node id once the subtree around it is fetched. The
 * search resolver takes the `ottId` from here and goes through the normal
 * subtree path to get one, so a result from the API and one from the database
 * end up indistinguishable to the client.
 */
export type OtolNameMatch = {
  ottId: number;
  name: string;
  /**
   * Whether OTOL considers this a higher taxon - above species level.
   *
   * The endpoint returns no rank and no score, only this flag, so a result's
   * rank has to come from the taxon record once it is fetched. Order is as
   * returned, which is already best-match first.
   */
  higher: boolean;
};

/**
 * Ask OTOL for taxa whose name starts with `query`.
 *
 * This is the autocomplete endpoint rather than full TNRS matching: it is built
 * for prefix search against a partial name typed by a person, which is exactly
 * the case here, and it answers in one call without the two-step context
 * inference `match_names` needs.
 */
export async function fetchOtolNameMatches(
  query: string,
  limit = 10,
): Promise<OtolNameMatch[]> {
  let response: Response;

  try {
    response = await fetch(OTOL_AUTOCOMPLETE_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: query,
        include_suppressed: false,
      }),
    });
  } catch {
    return [];
  }

  if (!response.ok) {
    return [];
  }

  let json: unknown;

  try {
    json = await response.json();
  } catch {
    return [];
  }

  if (!Array.isArray(json)) {
    return [];
  }

  return json
    .map((entry) => {
      const row = entry as Record<string, unknown>;
      const ottId = Number(row.ott_id);

      if (!Number.isFinite(ottId)) {
        return null;
      }

      return {
        ottId,
        name: typeof row.unique_name === 'string' ? row.unique_name : '',
        higher: row.is_higher === true,
      };
    })
    .filter((match): match is OtolNameMatch => Boolean(match?.name))
    .slice(0, limit);
}
