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

/**
 * Human and near-human subjects, which need a composition of their own.
 *
 * A natural-history plate of an animal is a whole unclothed body, and for a
 * furred or scaled creature that is simply what it looks like. For a human it
 * is a nude, which is not what this site is illustrating — and the image
 * providers agree: the whole-body human prompt is rejected outright by
 * Cloudflare's content filter, so every human plate silently failed over to a
 * provider with no filter at all.
 *
 * Only the hairless hominids. Monkeys and apes are drawn whole, as any other
 * animal is.
 */
function isHumanSubject(...names: Array<string | null | undefined>): boolean {
  const hay = names.filter(Boolean).join(' ').toLowerCase();
  return /\bhomo\b|\bhuman\b|hominid|hominin|sapiens|neanderthal|denisovan/.test(hay);
}

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
      /*
       * `morphology` is pasted straight into the image prompt, so it is written
       * for a painter rather than a taxonomist: concrete shape, proportion,
       * colour and texture, which is what a diffusion model can actually draw.
       * A terse lock like "bipedal, upright posture" leaves it to invent the
       * rest, and what it invents is where the distortions come from.
       *
       * Phrased only as what is there. A negation here would be copied into the
       * image prompt, and naming a thing to exclude it is what puts it in the
       * picture.
       */
      'morphology: 20-40 words a painter could follow — overall shape and proportions,',
      'colour, surface texture, and the one or two features that make it recognisable.',
      'Describe only what is present; never phrase it as what the organism is not.',
      'domain=microbe for bacteria, archaea, unicellular protists, and other non-metazoan microbial eukaryotes.',
      'domain=animal ONLY if the lineage includes Metazoa/Animalia.',
      hintClause,
    ].join(' '),
    user: `Taxon: ${taxon}. ${rankClause} ${lineageClause}`.trim(),
  };
}

/**
 * What a microbe looks like, for a painter, when no model was available to say.
 *
 * Said as what to draw. It used to end "— not a macroscopic animal", and this
 * string is pasted straight into the image prompt — so every microbe plate was
 * conditioned on the words "macroscopic animal", which is the same trap the ban
 * list fell into and is documented under `adaptImagePromptForFlux`. It runs
 * whenever no text model is available to resolve a specimen, which is the norm
 * once a quota is spent, and so was in force for much of the library that came
 * back drawn as animals.
 */
const MICROBE_MORPHOLOGY = 'Colonies of tiny single cells at high magnification'
  + ' — smooth translucent rods and spheres with faint granular interiors,'
  + ' drawn in pale grey-green and ochre washes';

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
        ? MICROBE_MORPHOLOGY
        : `Recognizable living form of ${name.trim()}`,
      isMicroscopic: domainHint === 'microbe',
      domain: domainHint,
    };
  }
  return {
    specimenName: name.trim(),
    morphology: microbial
      ? MICROBE_MORPHOLOGY
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
      `Hand-colored 19th-century microscope plate of ${subject}`,
      `(${taxon}).`,
      rankClause,
      `${specimen.morphology}.`,
      'A few cells of one kind seen through a brass microscope, drawn large and',
      'filling most of the plate: translucent bodies with faint internal detail',
      'on a plain pale ground.',
      'Fine engraved linework, visible hatching, muted ochre and grey washes,',
      'antique parchment.',
    ].join(' ');
  }

  return [
    `Hand-colored 19th-century natural-history lithograph of ${subject}`,
    `(${taxon}).`,
    rankClause,
    `${specimen.morphology}.`,
    'Fine engraved linework with visible hatching, soft muted watercolor washes,',
    'earthy ochres and greys on antique parchment, flat staged scientific-plate',
    'composition, drawn by hand.',
    // eslint-disable-next-line no-nested-ternary
    isHumanSubject(taxon, subject)
      /*
       * Head and shoulders, and clothed. Described as what to draw rather than
       * as a restriction: naming anatomy in order to exclude it is what puts it
       * in the picture. A bust also happens to be the safer subject to draw —
       * fewer limbs and joints to get wrong.
       */
      ? 'A head-and-shoulders portrait study in three-quarter view, the figure'
        + ' wearing a plain draped cloth across the shoulders and chest,'
      : specimen.domain === 'plant' || specimen.domain === 'fungus'
        ? 'The single specimen laid out on plain paper, every part clearly drawn,'
        : 'One animal in profile, the whole body from head to feet inside the picture,'
          + ' natural stance with correct limbs and joints,',
    /*
     * "Blank margins" summoned a physical mount: the plate came back as a
     * framed print with a border, and the border carried a garbled caption.
     * Describing the ground the organism sits on, rather than the edge of the
     * paper, keeps the frame out of the picture.
     */
    'centered and drawn large against a plain pale ground.',
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
 * Flux follows short, front-loaded, positive description; long policy text is
 * ignored at best and obeyed backwards at worst.
 *
 * The prompt used to carry a ban list — "hard ban: insect, fly, moth, beetle,
 * mite, spider" — and microbes came back drawn as insect larvae and mites. A
 * diffusion model conditions on the tokens it is given; naming a thing to
 * forbid it puts that thing in the conditioning. Measured on one taxon, same
 * model and steps: with the ban list, a spiked mass ringed by a dozen
 * mite-like specks; with the bans removed and the organism simply described,
 * a single centered red alga with a holdfast, no text and nothing else in
 * frame.
 *
 * So nothing here names what must not appear. What is wanted is described, and
 * the rest is left unsaid.
 */
export function adaptImagePromptForFlux(
  prompt: string,
  specimen?: ResolvedSpecimen | null,
): string {
  const microbial = specimen
    ? (specimen.isMicroscopic || specimen.domain === 'microbe')
    : isLikelyMicrobial(prompt);

  if (microbial) {
    const subject = specimen?.specimenName ?? '';
    const morph = specimen?.morphology ?? '';
    return [
      'Hand-colored 19th-century microscope plate on antique parchment.',
      subject,
      morph,
      'A few translucent cells of one kind on a plain pale ground,',
      'fine engraved linework, muted ochre washes, one centered subject,',
      'empty margins.',
    ].filter(Boolean).join(' ');
  }

  const clipped = prompt.length > 900 ? `${prompt.slice(0, 900)}…` : prompt;
  return clipped;
}

/**
 * Second attempt, with the reviewer's corrections folded in.
 *
 * Kept as positive description like the first attempt. This used to append
 * "never an insect or animal" and paste the reviewer's notes verbatim — notes
 * that read "remove the text labels" — so the retry reintroduced exactly the
 * naming that makes a diffusion model draw the thing. The rubric now asks for
 * fixes phrased as what the plate should show, so they can be passed straight
 * through.
 */
export function tightenImagePrompt(
  prompt: string,
  specimen: ResolvedSpecimen,
  suggestions: string[],
): string {
  const fixes = suggestions.filter(Boolean).slice(0, 3).join('; ');
  return [
    prompt,
    `Again, and more precisely: ${specimen.specimenName}.`,
    `${specimen.morphology}.`,
    specimen.isMicroscopic || specimen.domain === 'microbe'
      ? 'Cells at microscope magnification.'
      : '',
    fixes,
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
    '{"taxon_match":n,"morphology":n,"anatomy":n,"style_plate":n,"single_subject":n,"no_text":n,"overall":n,"pass":true|false,"suggestions":["…"]}',
    'taxon_match: correct organism class for the named specimen (microbe vs animal is critical).',
    'morphology: matches the morphology lock.',
    'anatomy: anatomically plausible and free of generation artefacts — score low for limbs or '
    + 'digits that are duplicated, missing, fused or miscounted, joints bending the wrong way, a '
    + 'head at an impossible angle to the neck, melted or asymmetric faces, and garbled lettering. '
    + 'Judge this independently of whether the organism is the right one: a correct species drawn '
    + 'with a broken body scores low here.',
    'style_plate: looks like a 19th-century hand-colored lithograph/engraving (not photo/3D).',
    'single_subject: one centered organism, not a collage.',
    'no_text: no labels, numbers, watermarks, scale bars.',
    'overall: weighted mean; pass=true only if overall>=7 AND taxon_match>=6 AND anatomy>=6.',
    'suggestions: 1-2 short fixes if not passing. Phrase each as what the plate',
    'should show, never as something to remove — these are pasted into the image',
    'prompt, and naming a thing there is what puts it in the picture.',
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
