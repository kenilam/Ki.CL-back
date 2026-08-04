import type { TaxonVisualStatus } from 'server/Types/graphql.js';

export type { TaxonVisualStatus };

export type TaxonVisualScoreResult = {
  overall: number;
  taxonMatch: number;
  pass: boolean;
};

/** Whether waiting helps, when generation is out of quota. */
export type TaxonVisualExhaustion = 'REFILLS' | 'BILLING';

export interface TaxonVisualResult {
  status: TaxonVisualStatus;
  ottId: number;
  nodeId: string | null;
  assetId: string | null;
  description: string | null;
  visualScore: TaxonVisualScoreResult | null;
  /** Set only when status is EXHAUSTED. */
  exhaustion: TaxonVisualExhaustion | null;
}
