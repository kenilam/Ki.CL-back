import { runProviderFailover } from 'server/DataSources/AI/failover.js';
import { buildTextProviders } from 'server/DataSources/AI/text/index.js';

export async function generateTaxonDescription(prompt: string): Promise<string> {
  return runProviderFailover(buildTextProviders(prompt), 'description');
}
