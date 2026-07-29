import { runProviderFailover } from './providers/failover.js';
import { buildTextChatProviders } from './providers/text/index.js';
import {
  applyLineageDomainGate,
  type LineageDomainHint,
} from './lineageDomain.js';
import {
  buildResolveSpecimenPrompt,
  fallbackSpecimen,
  type ResolvedSpecimen,
  type ResolveSpecimenContext,
  type SpecimenDomain,
} from './prompt.js';

function parseJsonObject(raw: string): Record<string, unknown> | null {
  const trimmed = raw.trim();
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const body = fenced?.[1]?.trim() ?? trimmed;
  const start = body.indexOf('{');
  const end = body.lastIndexOf('}');
  if (start < 0 || end <= start) {
    return null;
  }
  try {
    return JSON.parse(body.slice(start, end + 1)) as Record<string, unknown>;
  } catch {
    return null;
  }
}

function asDomain(value: unknown): SpecimenDomain {
  if (
    value === 'microbe'
    || value === 'animal'
    || value === 'plant'
    || value === 'fungus'
    || value === 'other'
  ) {
    return value;
  }
  return 'other';
}

function normalizeSpecimen(
  parsed: Record<string, unknown>,
  name: string,
  rank: string | null,
  domainHint?: SpecimenDomain | null,
): ResolvedSpecimen {
  const fallback = fallbackSpecimen(name, rank, domainHint);
  const specimenName = typeof parsed.specimenName === 'string'
    ? parsed.specimenName.trim()
    : '';
  const morphology = typeof parsed.morphology === 'string'
    ? parsed.morphology.trim()
    : '';

  return {
    specimenName: specimenName || fallback.specimenName,
    morphology: morphology || fallback.morphology,
    isMicroscopic: typeof parsed.isMicroscopic === 'boolean'
      ? parsed.isMicroscopic
      : fallback.isMicroscopic,
    domain: asDomain(parsed.domain) !== 'other'
      ? asDomain(parsed.domain)
      : fallback.domain,
  };
}

export type ResolveSpecimenOptions = ResolveSpecimenContext & {
  domainHintFull?: LineageDomainHint | null;
};

/**
 * Text step: lock a concrete extant specimen before image generation.
 * Falls back to a heuristic specimen if all chat providers fail.
 * Lineage domain gate corrects Metazoa / etymology hallucinations.
 */
export async function resolveSpecimen(
  name: string,
  rank: string | null,
  options: ResolveSpecimenOptions = {},
): Promise<ResolvedSpecimen> {
  const domainHint = options.domainHintFull?.domain ?? options.domainHint ?? null;
  const { system, user } = buildResolveSpecimenPrompt(name, rank, {
    lineagePath: options.lineagePath,
    domainHint,
  });

  let specimen: ResolvedSpecimen;

  try {
    const raw = await runProviderFailover(
      buildTextChatProviders({
        system,
        user,
        maxTokens: 220,
        temperature: 0.2,
      }),
      'description',
    );
    const parsed = parseJsonObject(raw);
    if (!parsed) {
      console.warn('[TaxonVisual] specimen resolve returned non-JSON; using fallback');
      specimen = fallbackSpecimen(name, rank, domainHint);
    } else {
      specimen = normalizeSpecimen(parsed, name, rank, domainHint);
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.warn(`[TaxonVisual] specimen resolve failed (${message}); using fallback`);
    specimen = fallbackSpecimen(name, rank, domainHint);
  }

  const gated = applyLineageDomainGate(specimen, options.domainHintFull ?? null);
  if (
    gated.domain !== specimen.domain
    || gated.isMicroscopic !== specimen.isMicroscopic
    || gated.morphology !== specimen.morphology
  ) {
    console.warn(
      `[TaxonVisual] lineage domain gate corrected "${name}": `
      + `${specimen.domain}/micro=${specimen.isMicroscopic} → `
      + `${gated.domain}/micro=${gated.isMicroscopic}`
      + (options.domainHintFull
        ? ` (hint=${options.domainHintFull.domain}/${options.domainHintFull.strength} via ${options.domainHintFull.matchedBy})`
        : ''),
    );
  }

  console.log(
    `[TaxonVisual] resolved specimen for "${name}": ${gated.specimenName} (${gated.domain})`,
  );
  return gated;
}
