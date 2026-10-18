import type { TaxonVisual, TaxonVisualScore } from 'server/Types/graphql.js';

export type TaxonVisualScoreResult = Omit<TaxonVisualScore, '__typename'>;

export type TaxonVisualResult = Omit<TaxonVisual, '__typename' | 'visualScore'> & {
  visualScore: TaxonVisualScoreResult | null;
};
