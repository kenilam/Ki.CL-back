import { withFilter } from 'graphql-subscriptions';
import { Types } from 'mongoose';

import { validate } from 'server/Helpers/Validation/validate.js';
import { TreeOfLifeNodes } from 'server/DataSources/MongoDB/TreeOfLife/Model.js';
import { TaxonVisualStatus } from 'server/Types/graphql.js';
import { ensureTreeOfLifeNodeByOttId } from 'server/Modules/TreeOfLife/persist.js';
import { TaxonVisualSchema } from './validation.js';
import { buildTaxonDescriptionPrompt } from './prompt.js';
import { taxonVisualObjectExists } from './generateImage.js';
import { generateTaxonDescription } from './generateDescription.js';
import { runTaxonVisualPipeline } from './pipeline.js';
import { anyProviderAvailable } from './providers/failover.js';
import { buildImageProviders } from './providers/image/index.js';
import { ProviderLimitError } from './providerLimitError.js';
import {
  publishTaxonVisualUpdated,
  TAXON_VISUAL_UPDATED,
  taxonVisualPubSub,
} from './pubsub.js';
import type {
  TaxonVisualExhaustion,
  TaxonVisualResult,
  TaxonVisualScoreResult,
} from './types.js';

/**
 * How many plates a taxon gets before the best one stands.
 *
 * Some taxa the generator cannot draw - a rod-shaped bacterium keeps returning
 * as an insect however the prompt is tightened - and without a ceiling those
 * retry on every view for as long as the score stays low.
 */
const MAX_VISUAL_ATTEMPTS = 3;

const generatingOttIds = new Set<number>();

const SETTLED: TaxonVisualStatus[] = [
  TaxonVisualStatus.Ready,
  TaxonVisualStatus.Error,
  TaxonVisualStatus.Exhausted,
];

/**
 * Whether waiting will help, when generation ran out of quota.
 *
 * Only `BILLING` when every provider is out of credit - one allowance that
 * refills tomorrow is reason enough to wait, and saying otherwise would send
 * someone to a billing page they do not need.
 */
function exhaustionKind(error: unknown): 'REFILLS' | 'BILLING' | null {
  if (!(error instanceof ProviderLimitError)) {
    return null;
  }

  return error.needsBilling ? 'BILLING' : 'REFILLS';
}

function failureStatus(error: unknown): TaxonVisualStatus.Error | TaxonVisualStatus.Exhausted {
  if (error instanceof ProviderLimitError) {
    return TaxonVisualStatus.Exhausted;
  }
  const message = error instanceof Error ? error.message : String(error);
  if (
    message.toLowerCase().includes('billing')
    || message.toLowerCase().includes('quota')
    || message.toLowerCase().includes('rate limit')
  ) {
    return TaxonVisualStatus.Exhausted;
  }
  return TaxonVisualStatus.Error;
}

function toVisualScore(
  score: {
    overall?: number | null;
    taxonMatch?: number | null;
    taxon_match?: number | null;
    pass?: boolean | null;
  } | null | undefined,
): TaxonVisualScoreResult | null {
  if (!score) {
    return null;
  }
  const overall = score.overall;
  const taxonMatch = score.taxonMatch ?? score.taxon_match;
  const pass = score.pass;
  if (
    typeof overall !== 'number'
    || typeof taxonMatch !== 'number'
    || typeof pass !== 'boolean'
  ) {
    return null;
  }
  return { overall, taxonMatch, pass };
}

function toResult(doc: {
  ottId: number;
  nodeId?: string | null;
  description?: string | null;
  assetId?: unknown;
  visualStatus?: TaxonVisualStatus | null;
  visualScore?: TaxonVisualScoreResult | null;
  visualExhaustion?: TaxonVisualExhaustion | null;
  status?: TaxonVisualStatus;
  error?: string | null;
}): TaxonVisualResult {
  let status = doc.status ?? doc.visualStatus ?? TaxonVisualStatus.Pending;
  if (
    status === TaxonVisualStatus.Error
    && doc.error
    && (
      doc.error.toLowerCase().includes('billing')
      || doc.error.toLowerCase().includes('quota')
      || doc.error.toLowerCase().includes('studio budget')
      || doc.error.toLowerCase().includes('rate limit')
    )
  ) {
    status = TaxonVisualStatus.Exhausted;
  }

  return {
    status,
    ottId: doc.ottId,
    nodeId: doc.nodeId ?? null,
    assetId: doc.assetId != null ? String(doc.assetId) : null,
    description: doc.description ?? null,
    visualScore: toVisualScore(doc.visualScore),
    /*
     * Only meaningful while the quota is what is stopping us. Carrying it into
     * a READY result would leave a stale reason attached to a plate that
     * exists.
     */
    exhaustion: status === TaxonVisualStatus.Exhausted
      ? doc.visualExhaustion ?? 'REFILLS'
      : null,
  };
}

async function resolveNode(ottId: number, name: string, rank: string | null) {
  let existing = await TreeOfLifeNodes.findOne({ ottId }).lean();
  if (!existing) {
    await ensureTreeOfLifeNodeByOttId(ottId);
    existing = await TreeOfLifeNodes.findOne({ ottId }).lean();
  }

  if (!existing) {
    const nodeId = `ott:${ottId}`;
    await TreeOfLifeNodes.findOneAndUpdate(
      { ottId },
      {
        $setOnInsert: {
          nodeId,
          ottId,
          name,
          rank,
          description: null,
          visualStatus: null,
          visualScore: null,
          prompt: null,
          error: null,
          assetId: null,
          numTips: null,
        },
      },
      { upsert: true },
    );
    existing = await TreeOfLifeNodes.findOne({ ottId }).lean();
  }

  return existing;
}

async function runGeneration(
  ottId: number,
  nodeId: string,
  name: string,
  rank: string | null,
) {
  if (generatingOttIds.has(ottId)) {
    return;
  }

  generatingOttIds.add(ottId);

  try {
    const {
      assetId,
      prompt,
      description,
      imageAttempts,
      imageScore,
    } = await runTaxonVisualPipeline(ottId, name, rank);

    /*
     * Only a real review is stored. `scored: false` means no provider ever
     * looked at the image, and writing numbers for that would put an
     * unreviewed plate on record as a reviewed one - which is exactly how a
     * whole library of them came to look approved.
     */
    const visualScore = toVisualScore(
      imageScore?.scored
        ? {
            overall: imageScore.overall,
            taxonMatch: imageScore.taxon_match,
            pass: imageScore.pass,
          }
        : null,
    );

    console.log(
      `[TaxonVisual] pipeline ready ottId=${ottId} attempts=${imageAttempts} `
      + `score=${imageScore?.overall ?? 'n/a'} pass=${imageScore?.pass ?? 'n/a'}`,
    );

    await TreeOfLifeNodes.findOneAndUpdate(
      { ottId },
      {
        $set: {
          nodeId,
          name,
          rank,
          prompt,
          description,
          assetId: new Types.ObjectId(assetId),
          visualStatus: TaxonVisualStatus.Ready,
          visualScore,
          error: null,
        },
        $unset: { imageUrl: 1 },
      },
    );
    publishTaxonVisualUpdated(toResult({
      ottId,
      nodeId,
      description,
      assetId,
      visualScore,
      status: TaxonVisualStatus.Ready,
    }));
  } catch (error) {
    const status = failureStatus(error);
    const message = error instanceof Error ? error.message : 'Image generation failed';
    await TreeOfLifeNodes.findOneAndUpdate(
      { ottId },
      {
        $set: {
          nodeId,
          name,
          rank,
          description: null,
          visualStatus: status,
          visualScore: null,
          visualExhaustion: exhaustionKind(error),
          error: message,
        },
        $unset: { assetId: 1, imageUrl: 1 },
      },
    );
    publishTaxonVisualUpdated(toResult({
      ottId,
      nodeId,
      description: null,
      assetId: null,
      visualScore: null,
      status,
      error: message,
    }));
  } finally {
    generatingOttIds.delete(ottId);
  }
}

async function runDescriptionOnly(
  ottId: number,
  nodeId: string,
  name: string,
  rank: string | null,
  assetId: string,
) {
  if (generatingOttIds.has(ottId)) {
    return;
  }

  generatingOttIds.add(ottId);

  try {
    const description = await generateTaxonDescription(
      buildTaxonDescriptionPrompt(name, rank),
    );
    await TreeOfLifeNodes.findOneAndUpdate(
      { ottId },
      { $set: { description } },
    );
    publishTaxonVisualUpdated(toResult({
      ottId,
      nodeId,
      description,
      assetId,
      status: TaxonVisualStatus.Ready,
    }));
  } catch {
    // Image already READY - keep it; description stays null.
  } finally {
    generatingOttIds.delete(ottId);
  }
}

/**
 * Failover asset is provisional: try OpenAI only. On success, replace the
 * asset; on failure, keep the existing failover render.
 */
/**
 * Try again for a plate the reviewer rejected.
 *
 * Was gated on the generator's name: anything not from OpenAI counted as
 * provisional and was re-rendered on every view, forever. That was a stand-in
 * for quality, chosen when the only score available was a fabricated 7 - and a
 * poor one, since it retried good renders as hard as bad ones and stopped
 * retrying a bad OpenAI render entirely. The review score says the thing the
 * vendor name was guessing at, so it is what decides now.
 *
 * The whole chain is used rather than OpenAI alone, so this still works when
 * the preferred provider is out of credit.
 */
async function runRegeneration(
  ottId: number,
  nodeId: string,
  name: string,
  rank: string | null,
  previousAssetId: string,
  previousDescription: string | null,
) {
  if (generatingOttIds.has(ottId)) {
    return;
  }

  generatingOttIds.add(ottId);

  try {
    const {
      assetId,
      prompt,
      description,
      imageScore,
    } = await runTaxonVisualPipeline(ottId, name, rank);

    /*
     * Only a real review is stored. `scored: false` means no provider ever
     * looked at the image, and writing numbers for that would put an
     * unreviewed plate on record as a reviewed one - which is exactly how a
     * whole library of them came to look approved.
     */
    const visualScore = toVisualScore(
      imageScore?.scored
        ? {
            overall: imageScore.overall,
            taxonMatch: imageScore.taxon_match,
            pass: imageScore.pass,
          }
        : null,
    );

    await TreeOfLifeNodes.findOneAndUpdate(
      { ottId },
      {
        $set: {
          nodeId,
          name,
          rank,
          prompt,
          description: description ?? previousDescription,
          assetId: new Types.ObjectId(assetId),
          visualStatus: TaxonVisualStatus.Ready,
          visualScore,
          error: null,
        },
        $inc: { visualAttempts: 1 },
      },
    );
    publishTaxonVisualUpdated(toResult({
      ottId,
      nodeId,
      description: description ?? previousDescription,
      assetId,
      visualScore,
      status: TaxonVisualStatus.Ready,
    }));
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);

    /*
     * A failed attempt counts only if something was actually drawn.
     *
     * The ceiling exists to stop retrying a taxon the generator cannot render
     * well - it is a statement about the subject, not about the weather. When
     * every provider is out of quota nothing was attempted at all, and counting
     * that would retire taxa for the duration of an outage and never let them
     * back. Measured: two of one taxon's three attempts were spent this way
     * before the exhaustion was even visible.
     */
    const nothingRendered = error instanceof ProviderLimitError
      || message.includes('exhausted quota')
      || message.includes('No image providers configured');

    if (!nothingRendered) {
      await TreeOfLifeNodes.updateOne({ ottId }, { $inc: { visualAttempts: 1 } });
    }

    console.warn(
      `[TaxonVisual] regeneration failed for ottId ${ottId}`
      + `${nothingRendered ? ' (providers unavailable - attempt not counted)' : ''};`
      + ` keeping existing asset:`,
      message,
    );
    publishTaxonVisualUpdated(toResult({
      ottId,
      nodeId,
      description: previousDescription,
      assetId: previousAssetId,
      status: TaxonVisualStatus.Ready,
    }));
  } finally {
    generatingOttIds.delete(ottId);
  }
}

export default {
  Query: {
    TaxonVisual: async (
      _: unknown,
      args: { ottId: number; name: string; rank?: string | null },
    ): Promise<TaxonVisualResult> => {
      const input = validate(TaxonVisualSchema, args);
      const ottId = input.ottId;
      const name = input.name.trim();
      const rank = input.rank?.trim() || null;

      const existing = await resolveNode(ottId, name, rank);
      if (!existing) {
        throw new Error(`Failed to resolve TreeOfLife node for ottId ${ottId}`);
      }

      const nodeId = existing.nodeId;
      const status = existing.visualStatus;
      const resolvedName = existing.name?.trim() || name;
      const resolvedRank = existing.rank?.trim() || rank;

      if (generatingOttIds.has(ottId) || status === TaxonVisualStatus.Pending) {
        return toResult({
          ottId,
          nodeId,
          description: existing.description,
          assetId: existing.assetId,
          status: TaxonVisualStatus.Pending,
        });
      }

      if (status === TaxonVisualStatus.Ready && existing.assetId) {
        const inBucket = await taxonVisualObjectExists(ottId);
        if (inBucket) {
          const assetId = String(existing.assetId);

          /*
           * A plate the reviewer passed is finished, whoever drew it. One that
           * failed - or that no reviewer ever saw - is worth another attempt,
           * up to a ceiling.
           */
          const reviewed = existing.visualScore ?? null;
          const settled = reviewed?.pass === true;
          const spent = (existing.visualAttempts ?? 0) >= MAX_VISUAL_ATTEMPTS;

          if (settled || spent) {
            if (!existing.description?.trim()) {
              void runDescriptionOnly(
                ottId,
                nodeId,
                resolvedName,
                resolvedRank,
                assetId,
              );
            }
            return toResult({
              ottId,
              nodeId,
              assetId,
              description: existing.description,
              visualScore: toVisualScore(reviewed),
              status: TaxonVisualStatus.Ready,
            });
          }

          void runRegeneration(
            ottId,
            nodeId,
            resolvedName,
            resolvedRank,
            assetId,
            existing.description ?? null,
          );

          /*
           * `READY`, not `PENDING`: there is a usable plate on screen right
           * now, and calling it pending told the client to show a spinner over
           * an image it already had - usually for a replacement that never
           * arrived. If the attempt does produce something better, the
           * subscription pushes it.
           */
          return toResult({
            ottId,
            nodeId,
            assetId,
            description: existing.description,
            visualScore: toVisualScore(reviewed),
            status: TaxonVisualStatus.Ready,
          });
        }
      } else if (status === TaxonVisualStatus.Error) {
        return toResult({
          ...existing,
          ottId,
          assetId: null,
          status,
        });
      } else if (status === TaxonVisualStatus.Exhausted) {
        // Sticky only while every image provider is cooling down; otherwise retry.
        if (!anyProviderAvailable(buildImageProviders(''))) {
          return toResult({
            ...existing,
            ottId,
            assetId: null,
            status,
          });
        }
        // Fall through to clear status and re-run full pipeline.
      }

      await TreeOfLifeNodes.findOneAndUpdate(
        { ottId },
        {
          $set: {
            name: resolvedName,
            rank: resolvedRank,
            description: null,
            visualStatus: TaxonVisualStatus.Pending,
            visualScore: null,
            error: null,
          },
          $unset: { assetId: 1, imageUrl: 1 },
        },
      );

      void runGeneration(ottId, nodeId, resolvedName, resolvedRank);

      return {
        status: TaxonVisualStatus.Pending,
        ottId,
        nodeId,
        assetId: null,
        description: null,
        visualScore: null,
        // Generation has just been started, so nothing is exhausted yet.
        exhaustion: null,
      };
    },
  },

  Subscription: {
    TaxonVisualUpdated: {
      subscribe: withFilter(
        (_parent, args) => {
          const ottId = args?.ottId;
          const iterator = taxonVisualPubSub.asyncIterableIterator(
            TAXON_VISUAL_UPDATED,
          );

          if (typeof ottId === 'number') {
            void TreeOfLifeNodes.findOne({ ottId }).lean().then((doc) => {
              if (doc?.visualStatus && SETTLED.includes(doc.visualStatus)) {
                publishTaxonVisualUpdated(toResult({
                  ...doc,
                  ottId,
                  status: doc.visualStatus,
                }));
              }
            });
          }

          return iterator;
        },
        (
          payload: { TaxonVisualUpdated?: TaxonVisualResult } | undefined,
          variables: { ottId?: number } | undefined,
        ) => payload?.TaxonVisualUpdated?.ottId === variables?.ottId,
      ),
    },
  },
};
