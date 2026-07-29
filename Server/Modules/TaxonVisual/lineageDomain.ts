import type { SpecimenDomain, ResolvedSpecimen } from './prompt.js';

export type DomainHintStrength = 'hard' | 'soft';

export type LineageDomainHint = {
  domain: SpecimenDomain;
  strength: DomainHintStrength;
  /** Matched clade name that drove the hint (for logs). */
  matchedBy: string;
};

const NORM = (value: string) => value.trim().toLowerCase();

function lineageSet(names: string[]): Set<string> {
  return new Set(names.map(NORM).filter(Boolean));
}

function firstMatch(set: Set<string>, candidates: string[]): string | null {
  for (const candidate of candidates) {
    if (set.has(NORM(candidate))) {
      return candidate;
    }
  }
  return null;
}

/**
 * Infer organism domain from OTOL lineage names.
 * Hard hints come from major kingdoms; soft microbe covers eukaryotic
 * lineages that are not Metazoa / Fungi / Embryophyta (e.g. Rhodelphis).
 */
export function inferDomainFromLineage(
  lineageNames: string[],
): LineageDomainHint | null {
  const set = lineageSet(lineageNames);
  if (!set.size) {
    return null;
  }

  const animal = firstMatch(set, ['metazoa', 'animalia']);
  if (animal) {
    return { domain: 'animal', strength: 'hard', matchedBy: animal };
  }

  const fungus = firstMatch(set, ['fungi']);
  if (fungus) {
    return { domain: 'fungus', strength: 'hard', matchedBy: fungus };
  }

  const plant = firstMatch(set, [
    'embryophyta',
    'viridiplantae',
    'streptophyta',
  ]);
  if (plant) {
    return { domain: 'plant', strength: 'hard', matchedBy: plant };
  }

  const microbe = firstMatch(set, [
    'bacteria',
    'archaea',
    'bacillati',
    'cyanobacteriota',
    'pseudomonadota',
  ]);
  if (microbe) {
    return { domain: 'microbe', strength: 'hard', matchedBy: microbe };
  }

  // Eukaryota without Metazoa/Fungi/land plants → microbial eukaryote / protist.
  const euk = firstMatch(set, ['eukaryota', 'eukarya']);
  if (euk) {
    return { domain: 'microbe', strength: 'soft', matchedBy: euk };
  }

  return null;
}

function defaultMorphology(domain: SpecimenDomain, specimenName: string): string {
  switch (domain) {
    case 'microbe':
      return 'Unicellular cells or small colonies as under a light microscope — not a macroscopic animal';
    case 'plant':
      return `Recognizable living plant form of ${specimenName}`;
    case 'fungus':
      return `Recognizable living fungal form of ${specimenName}`;
    case 'animal':
      return `Recognizable living animal form of ${specimenName}`;
    default:
      return `Recognizable living form of ${specimenName}`;
  }
}

function morphologyLooksVertebrate(morphology: string): boolean {
  return /\b(fish|fin|fins|torpedo|jaw|teeth|scale|scales|gill|mammal|bird|feather|wing|wings|snake|reptile|amphibian|dolphin|whale|shark)\b/i
    .test(morphology);
}

/**
 * Correct LLM specimen locks that contradict OTOL lineage.
 * Soft microbe only overrides animal (etymology hallucinations).
 */
export function applyLineageDomainGate(
  specimen: ResolvedSpecimen,
  hint: LineageDomainHint | null,
): ResolvedSpecimen {
  if (!hint) {
    return specimen;
  }

  const name = specimen.specimenName.trim() || 'specimen';
  const sameDomain = specimen.domain === hint.domain;

  if (hint.strength === 'soft') {
    if (hint.domain === 'microbe' && specimen.domain === 'animal') {
      return {
        specimenName: specimen.specimenName,
        domain: 'microbe',
        isMicroscopic: true,
        morphology: morphologyLooksVertebrate(specimen.morphology)
          ? defaultMorphology('microbe', name)
          : (specimen.morphology || defaultMorphology('microbe', name)),
      };
    }
    if (hint.domain === 'microbe' && (sameDomain || specimen.domain === 'other')) {
      return {
        ...specimen,
        domain: 'microbe',
        isMicroscopic: true,
        morphology: morphologyLooksVertebrate(specimen.morphology)
          ? defaultMorphology('microbe', name)
          : specimen.morphology,
      };
    }
    return specimen;
  }

  // Hard kingdom hint — always win on domain.
  if (sameDomain) {
    if (hint.domain === 'microbe' && !specimen.isMicroscopic) {
      return {
        ...specimen,
        isMicroscopic: true,
        morphology: morphologyLooksVertebrate(specimen.morphology)
          ? defaultMorphology('microbe', name)
          : specimen.morphology,
      };
    }
    if (
      hint.domain !== 'microbe'
      && morphologyLooksVertebrate(specimen.morphology)
      && hint.domain !== 'animal'
    ) {
      return {
        ...specimen,
        morphology: defaultMorphology(hint.domain, name),
      };
    }
    return specimen;
  }

  return {
    specimenName: specimen.specimenName,
    domain: hint.domain,
    isMicroscopic: hint.domain === 'microbe',
    morphology: (
      hint.domain === 'microbe' || morphologyLooksVertebrate(specimen.morphology)
        ? defaultMorphology(hint.domain, name)
        : specimen.morphology
    ) || defaultMorphology(hint.domain, name),
  };
}
