import { runProviderFailover } from './providers/failover.js';
import { buildTextProviders } from './providers/text/index.js';

export async function generateTaxonDescription(prompt: string): Promise<string> {
  return runProviderFailover(buildTextProviders(prompt), 'description');
}
