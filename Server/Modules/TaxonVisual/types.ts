import type { TaxonVisualStatus } from 'server/Types/graphql.js';

export type { TaxonVisualStatus };

export type TaxonVisualScoreResult = {
  overall: number;
  taxonMatch: number;
  pass: boolean;
};

export interface TaxonVisualResult {
  status: TaxonVisualStatus;
  ottId: number;
  nodeId: string | null;
  assetId: string | null;
  description: string | null;
  visualScore: TaxonVisualScoreResult | null;
}
