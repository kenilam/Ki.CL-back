const OTOL_SUBTREE_URL = 'https://api.opentreeoflife.org/v3/tree_of_life/subtree';
const OTOL_TAXON_INFO_URL = 'https://api.opentreeoflife.org/v3/taxonomy/taxon_info';

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
