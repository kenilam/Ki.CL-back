import { generateTaxonDescription } from 'server/Modules/TaxonVisual/generateDescription.js';
import {
  generateTaxonImageBuffer,
  persistTaxonImage,
  type CreatedTaxonAsset,
} from 'server/Modules/TaxonVisual/generateImage.js';
import {
  inferDomainFromLineage,
} from 'server/Modules/TaxonVisual/lineageDomain.js';
import {
  buildTaxonDescriptionPrompt,
  buildTaxonVisualPromptFromSpecimen,
  tightenImagePrompt,
  type ResolvedSpecimen,
} from 'server/Modules/TaxonVisual/prompt.js';
import { resolveSpecimen } from 'server/Modules/TaxonVisual/resolveSpecimen.js';
import {
  scoreTaxonImage,
  type ImageScore,
} from 'server/Modules/TaxonVisual/scoreImage.js';
import {
  fetchOtolTaxonInfo,
  formatLineagePath,
  lineageNamesForTaxon,
} from 'server/Modules/TreeOfLife/otol.js';

/** Initial generate + one vision-guided retry (matches learning agent budget). */
const MAX_IMAGE_ATTEMPTS = 2;

const LOG = '[TaxonVisual]';

export type TaxonVisualPipelineResult = CreatedTaxonAsset & {
  prompt: string;
  description: string | null;
  specimen: ResolvedSpecimen;
  imageScore: ImageScore | null;
  imageAttempts: number;
};

export type TaxonVisualPipelineOptions = {
  openaiOnly?: boolean;
};

function formatScore(score: ImageScore): string {
  return [
    `overall=${score.overall}`,
    `taxon_match=${score.taxon_match}`,
    `morphology=${score.morphology}`,
    `style_plate=${score.style_plate}`,
    `single_subject=${score.single_subject}`,
    `no_text=${score.no_text}`,
    `pass=${score.pass}`,
    score.skipped ? 'skipped=true' : null,
  ].filter(Boolean).join(' ');
}

/**
 * Fixed pipeline (not a free-form agent):
 * OTOL lineage → resolve living specimen → generate plate → vision score → retry ≤1 → accept best.
 */
export async function runTaxonVisualPipeline(
  ottId: number,
  name: string,
  rank: string | null,
  options: TaxonVisualPipelineOptions = {},
): Promise<TaxonVisualPipelineResult> {
  const startedAt = Date.now();
  const mode = options.openaiOnly ? 'openai-only' : 'pipeline';
  console.log(
    `${LOG} pipeline start ottId=${ottId} name="${name}" rank=${rank ?? '—'} mode=${mode}`,
  );

  const taxonInfo = await fetchOtolTaxonInfo(ottId);
  const lineagePath = taxonInfo ? formatLineagePath(taxonInfo) : null;
  const domainHintFull = taxonInfo
    ? inferDomainFromLineage(lineageNamesForTaxon(taxonInfo))
    : null;

  if (lineagePath) {
    console.log(
      `${LOG} lineage ottId=${ottId} path="${lineagePath}"`
      + (domainHintFull
        ? ` hint=${domainHintFull.domain}/${domainHintFull.strength} via=${domainHintFull.matchedBy}`
        : ' hint=—'),
    );
  } else {
    console.warn(`${LOG} lineage ottId=${ottId} unavailable; resolve without OTOL ground truth`);
  }

  const specimen = await resolveSpecimen(name, rank, {
    lineagePath,
    domainHint: domainHintFull?.domain ?? null,
    domainHintFull,
  });
  console.log(
    `${LOG} specimen ottId=${ottId} `
    + `specimen="${specimen.specimenName}" domain=${specimen.domain} `
    + `microscopic=${specimen.isMicroscopic} morph="${specimen.morphology}"`,
  );

  let prompt = buildTaxonVisualPromptFromSpecimen(name, rank, specimen);
  console.log(
    `${LOG} prompt ottId=${ottId} chars=${prompt.length} preview="${prompt.slice(0, 120)}…"`,
  );

  const descriptionPromise = generateTaxonDescription(
    buildTaxonDescriptionPrompt(name, rank, specimen, lineagePath),
  ).then((description) => {
    console.log(
      `${LOG} description ottId=${ottId} chars=${description.length}`,
    );
    return description;
  }).catch((error: unknown) => {
    const message = error instanceof Error ? error.message : String(error);
    console.warn(`${LOG} description failed ottId=${ottId}: ${message}`);
    return null;
  });

  type Candidate = {
    buffer: Buffer;
    generator: string;
    prompt: string;
    score: ImageScore;
  };

  let best: Candidate | null = null;
  let attempts = 0;

  for (let attempt = 0; attempt < MAX_IMAGE_ATTEMPTS; attempt += 1) {
    attempts += 1;
    const attemptStartedAt = Date.now();
    console.log(
      `${LOG} image attempt ${attempt + 1}/${MAX_IMAGE_ATTEMPTS} ottId=${ottId}`,
    );

    const generated = await generateTaxonImageBuffer(prompt, {
      openaiOnly: options.openaiOnly,
      specimen,
    });
    console.log(
      `${LOG} image generated ottId=${ottId} attempt=${attempt + 1} `
      + `generator=${generated.generator} bytes=${generated.buffer.length} `
      + `ms=${Date.now() - attemptStartedAt}`,
    );

    let score: ImageScore;
    try {
      const scoreStartedAt = Date.now();
      score = await scoreTaxonImage(generated.buffer, name, specimen, lineagePath);
      console.log(
        `${LOG} vision score ottId=${ottId} attempt=${attempt + 1} `
        + `${formatScore(score)} ms=${Date.now() - scoreStartedAt}`
        + (score.suggestions.length
          ? ` suggestions=${JSON.stringify(score.suggestions)}`
          : ''),
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.warn(
        `${LOG} vision score failed ottId=${ottId} attempt=${attempt + 1}: ${message}`,
      );
      // Don't block upload if vision is down — accept this render.
      score = {
        taxon_match: 7,
        morphology: 7,
        style_plate: 7,
        single_subject: 7,
        no_text: 7,
        overall: 7,
        pass: true,
        suggestions: [],
        skipped: true,
      };
    }

    const candidate: Candidate = {
      buffer: generated.buffer,
      generator: generated.generator,
      prompt,
      score,
    };

    if (!best || candidate.score.overall > best.score.overall) {
      best = candidate;
      console.log(
        `${LOG} best candidate ottId=${ottId} attempt=${attempt + 1} `
        + `generator=${candidate.generator} overall=${candidate.score.overall}`,
      );
    }

    if (score.pass) {
      console.log(`${LOG} vision pass ottId=${ottId} attempt=${attempt + 1}`);
      break;
    }

    if (attempt + 1 < MAX_IMAGE_ATTEMPTS) {
      prompt = tightenImagePrompt(prompt, specimen, score.suggestions);
      console.log(
        `${LOG} retrying ottId=${ottId} with tightened prompt `
        + `(chars=${prompt.length}) fixes=${JSON.stringify(score.suggestions)}`,
      );
    } else {
      console.warn(
        `${LOG} vision failed after ${MAX_IMAGE_ATTEMPTS} attempts ottId=${ottId}; `
        + `accepting best overall=${best.score.overall} generator=${best.generator}`,
      );
    }
  }

  if (!best) {
    throw new Error('Taxon visual pipeline produced no image');
  }

  const asset = await persistTaxonImage(ottId, {
    buffer: best.buffer,
    generator: best.generator,
  });
  console.log(
    `${LOG} persisted ottId=${ottId} assetId=${asset.assetId} `
    + `url=${asset.url} generator=${asset.generator}`,
  );

  const description = await descriptionPromise;

  console.log(
    `${LOG} pipeline done ottId=${ottId} attempts=${attempts} `
    + `generator=${best.generator} ${formatScore(best.score)} `
    + `ms=${Date.now() - startedAt}`,
  );

  return {
    ...asset,
    prompt: best.prompt,
    description,
    specimen,
    imageScore: best.score,
    imageAttempts: attempts,
  };
}
