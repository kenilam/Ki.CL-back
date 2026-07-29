/**
 * Vintage natural-history plate — hand-colored lithograph / engraving feel
 * (19th-century scientific print), never photoreal or 3D studio.
 * Pipeline: resolve extant specimen → image prompt → vision QA → capped retry.
 */

export type SpecimenDomain =
  | 'microbe'
  | 'animal'
  | 'plant'
  | 'fungus'
  | 'other';

export type ResolvedSpecimen = {
  /** Concrete extant organism to depict (species or well-known form). */
  specimenName: string;
  /** Short morphology lock for the image model. */
  morphology: string;
  isMicroscopic: boolean;
  domain: SpecimenDomain;
};

function isLikelyMicrobial(name: string, rank?: string | null): boolean {
  const hay = `${name} ${rank ?? ''}`.toLowerCase();
  return /candidatus|archae|bacter|microb|protist|cyanobacter|prokaryot|unicellular|\bvirus\b|viral|fungal spore|yeast\b/.test(hay);
}

export type ResolveSpecimenContext = {
  /** OTOL lineage path, leaf → root (e.g. `Rhodelphis marinus › … › Eukaryota`). */
  lineagePath?: string | null;
  /** Ground-truth domain from lineage when known. */
  domainHint?: SpecimenDomain | null;
};

export function buildResolveSpecimenPrompt(
  name: string,
  rank?: string | null,
  context: ResolveSpecimenContext = {},
): { system: string; user: string } {
  const taxon = name.trim();
  const rankLabel = rank?.trim().toLowerCase() || null;
  const rankClause = rankLabel ? `Taxonomic rank: ${rankLabel}.` : '';
  const lineageClause = context.lineagePath?.trim()
    ? `OTOL lineage (leaf→root): ${context.lineagePath.trim()}.`
    : '';
  const hintClause = context.domainHint && context.domainHint !== 'other'
    ? `Domain MUST be "${context.domainHint}" (from lineage). Never invent Metazoa/animals from Latin etymology.`
    : 'Trust the lineage over how the Latin name sounds (e.g. -delphis does not mean dolphin/fish).';

  return {
    system: [
      'You are a taxonomist preparing an art brief for a natural-history plate.',
      'Pick ONE concrete living (extant) specimen that best represents the given taxon.',
      'If the taxon is already a species, use it. If it is a higher clade, pick a familiar extant member.',
      'Reply with ONLY valid JSON (no markdown):',
      '{"specimenName":"…","morphology":"…","isMicroscopic":true|false,"domain":"microbe"|"animal"|"plant"|"fungus"|"other"}',
      'morphology: 1 short sentence on body plan / appearance (no habitat essay).',
      'domain=microbe for bacteria, archaea, unicellular protists, and other non-metazoan microbial eukaryotes.',
      'domain=animal ONLY if the lineage includes Metazoa/Animalia.',
      hintClause,
    ].join(' '),
    user: `Taxon: ${taxon}. ${rankClause} ${lineageClause}`.trim(),
  };
}

export function fallbackSpecimen(
  name: string,
  rank?: string | null,
  domainHint?: SpecimenDomain | null,
): ResolvedSpecimen {
  const microbial = domainHint === 'microbe' || isLikelyMicrobial(name, rank);
  if (domainHint && domainHint !== 'other') {
    return {
      specimenName: name.trim(),
      morphology: domainHint === 'microbe'
        ? 'Unicellular cells or small colonies as under a light microscope — not a macroscopic animal'
        : `Recognizable living form of ${name.trim()}`,
      isMicroscopic: domainHint === 'microbe',
      domain: domainHint,
    };
  }
  return {
    specimenName: name.trim(),
    morphology: microbial
      ? 'Unicellular cells or small colonies as under a light microscope — not a macroscopic animal'
      : `Recognizable living form of ${name.trim()}`,
    isMicroscopic: microbial,
    domain: microbial ? 'microbe' : 'other',
  };
}

/** Image prompt locked to a resolved living specimen. */
export function buildTaxonVisualPromptFromSpecimen(
  taxonName: string,
  rank: string | null | undefined,
  specimen: ResolvedSpecimen,
): string {
  const taxon = taxonName.trim();
  const rankLabel = rank?.trim().toLowerCase() || null;
  const rankClause = rankLabel ? `Taxonomic rank of query: ${rankLabel}. ` : '';
  const subject = specimen.specimenName.trim() || taxon;

  if (specimen.isMicroscopic || specimen.domain === 'microbe') {
    return [
      `19th-century hand-colored microscope lithograph of ${subject}`,
      `(living specimen representing ${taxon}).`,
      rankClause,
      `Morphology lock: ${specimen.morphology}.`,
      'Subject: single-celled microbe / protist / archaeon / bacterium only — cells, flagellates, rods, cocci, or filaments under a light microscope.',
      'NOT a fish, insect, fly, moth, beetle, mite, spider, worm, mammal, plant, or any macroscopic animal.',
      'Ignore mythic or animal-sounding parts of Latin names (e.g. -delphis, -saurus).',
      'Style: antique scientific plate on parchment, fine engraving linework, muted ochre washes. One centered microscopic subject, plain background.',
      'No text, numbers, labels, scale bar, watermark, or collage.',
    ].join(' ');
  }

  return [
    `19th-century natural-history illustration of living specimen ${subject}`,
    `(representing taxon ${taxon}).`,
    rankClause,
    `Morphology lock: ${specimen.morphology}.`,
    'Style: hand-colored engraving or lithograph on antique parchment — fine linework, soft muted watercolor washes, earthy ochres and greys with restrained color accents. Flat staged scientific-plate composition, not a photograph.',
    `Depict only ${subject} with real-world morphology — do not invent an unrelated animal from how the name sounds.`,
    specimen.domain === 'plant' || specimen.domain === 'fungus'
      ? 'Show that single organism in a simple pastoral or plain paper field, anatomically clear.'
      : 'Single organism in profile or three-quarter view, anatomically clear, simple plain or pastoral field.',
    'Single centered subject filling most of the frame. No species montage, no crowded panorama, no collage of other taxa.',
    'No photorealism, no camera photo, no 3D render, no CGI, no plastic studio lighting, no modern digital sheen.',
    'No text, numbers, labels, legend, watermark, scale bar, UI, or captions.',
  ].join(' ');
}

/** @deprecated Prefer resolve → buildTaxonVisualPromptFromSpecimen. */
export function buildTaxonVisualPrompt(name: string, rank?: string | null): string {
  return buildTaxonVisualPromptFromSpecimen(
    name,
    rank,
    fallbackSpecimen(name, rank),
  );
}

/**
 * Flux / Schnell follows short front-loaded prompts; long policy text is ignored.
 * Rebuild a tight prompt when the subject looks microbial.
 */
export function adaptImagePromptForFlux(
  prompt: string,
  specimen?: ResolvedSpecimen | null,
): string {
  const microbial = specimen
    ? (specimen.isMicroscopic || specimen.domain === 'microbe')
    : isLikelyMicrobial(prompt);

  if (microbial) {
    const subject = specimen?.specimenName
      ? `Depict ${specimen.specimenName} only.`
      : '';
    const morph = specimen?.morphology ? specimen.morphology : '';
    return [
      'Antique microscope engraving of a single-celled microbe/protist only:',
      'tiny cells, flagellates, rods, or colonial filaments OK.',
      subject,
      morph,
      'Subject from this scientific name — microbe/protist, not animals.',
      'Hard ban: insect, fly, moth, butterfly, beetle, mite, spider, bird, mammal, fish, plant leaf.',
      'Hand-colored 19th-century lithograph, parchment, no text, no 3D, no photo.',
      prompt.slice(0, 220),
    ].filter(Boolean).join(' ');
  }

  const clipped = prompt.length > 900 ? `${prompt.slice(0, 900)}…` : prompt;
  return [
    clipped,
    'Vintage hand-colored lithograph only — not photo, not 3D, not CGI.',
    specimen?.specimenName
      ? `Real organism ${specimen.specimenName} only — never swap in an insect because the Latin sounds biological.`
      : 'Real organism for this scientific name only — never swap in an insect because the Latin sounds biological.',
  ].join(' ');
}

export function tightenImagePrompt(
  prompt: string,
  specimen: ResolvedSpecimen,
  suggestions: string[],
): string {
  const fixes = suggestions.filter(Boolean).slice(0, 3).join('; ');
  return [
    prompt,
    `CRITICAL CORRECTION: depict living specimen ${specimen.specimenName} only.`,
    `Morphology: ${specimen.morphology}.`,
    specimen.isMicroscopic || specimen.domain === 'microbe'
      ? 'Must remain microscopic cells — never an insect or animal.'
      : '',
    fixes ? `Reviewer notes to fix: ${fixes}` : '',
  ].filter(Boolean).join(' ');
}

/** Short plain-language blurb for the detail panel (chat, not image). */
export function buildTaxonDescriptionPrompt(
  name: string,
  rank?: string | null,
  specimen?: ResolvedSpecimen | null,
  lineagePath?: string | null,
): string {
  const taxon = name.trim();
  const rankLabel = rank?.trim().toLowerCase() || null;
  const rankClause = rankLabel ? ` (taxonomic rank: ${rankLabel})` : '';
  const specimenClause = specimen?.specimenName
    ? ` Focus on living specimen ${specimen.specimenName} (${specimen.morphology}; domain=${specimen.domain}).`
    : '';
  const lineageClause = lineagePath?.trim()
    ? ` OTOL lineage: ${lineagePath.trim()}. Do not invent a fish/mammal if lineage lacks Metazoa.`
    : '';

  return [
    `Write a short natural-history description of ${taxon}${rankClause}.${specimenClause}${lineageClause}`,
    `1–2 sentences, about 25–45 words.`,
    `Cover what it is (or the best-known living representative if this is a higher taxon), where it lives or how it is known, and one distinctive trait.`,
    `Plain prose for a general audience. No markdown, bullets, quotes, or leading labels.`,
  ].join(' ');
}

export function buildScoreImageSystemPrompt(): string {
  return [
    'You are a natural-history art director reviewing a generated scientific plate.',
    'Score the image 1–10 on each criterion and return ONLY valid JSON:',
    '{"taxon_match":n,"morphology":n,"style_plate":n,"single_subject":n,"no_text":n,"overall":n,"pass":true|false,"suggestions":["…"]}',
    'taxon_match: correct organism class for the named specimen (microbe vs animal is critical).',
    'morphology: matches the morphology lock.',
    'style_plate: looks like a 19th-century hand-colored lithograph/engraving (not photo/3D).',
    'single_subject: one centered organism, not a collage.',
    'no_text: no labels, numbers, watermarks, scale bars.',
    'overall: weighted mean; pass=true only if overall>=7 AND taxon_match>=6.',
    'suggestions: 1–2 short fixes if not passing.',
  ].join(' ');
}

export function buildScoreImageUserPrompt(
  taxonName: string,
  specimen: ResolvedSpecimen,
  lineagePath?: string | null,
): string {
  return [
    `Query taxon: ${taxonName.trim()}`,
    `Required living specimen: ${specimen.specimenName}`,
    `Morphology lock: ${specimen.morphology}`,
    `Domain: ${specimen.domain}; microscopic: ${specimen.isMicroscopic}`,
    lineagePath?.trim() ? `OTOL lineage: ${lineagePath.trim()}` : null,
    specimen.domain === 'microbe' || specimen.isMicroscopic
      ? 'Fail taxon_match if the plate shows a fish, mammal, insect, or any macroscopic animal.'
      : null,
    'Does this plate correctly depict that specimen in vintage scientific-plate style?',
  ].filter(Boolean).join('\n');
}
