import { PubSub } from 'graphql-subscriptions';

import type { TaxonVisualResult } from './types.js';

/** In-process bus — fine for single-instance; swap for Redis if you scale out. */
export const taxonVisualPubSub = new PubSub<{
  TAXON_VISUAL_UPDATED: { TaxonVisualUpdated: TaxonVisualResult };
}>();

export const TAXON_VISUAL_UPDATED = 'TAXON_VISUAL_UPDATED' as const;

export function publishTaxonVisualUpdated(result: TaxonVisualResult) {
  void taxonVisualPubSub.publish(TAXON_VISUAL_UPDATED, {
    TaxonVisualUpdated: result,
  });
}
