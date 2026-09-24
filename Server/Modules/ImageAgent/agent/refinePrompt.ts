import { runProviderFailover } from 'server/Modules/TaxonVisual/providers/failover.js';
import { buildTextChatProviders } from 'server/Modules/TaxonVisual/providers/text/index.js';
import type { ImageAgentStyle } from 'server/Types/graphql.js';
import { buildRefinePrompt, buildRetryPrompt } from './prompt.js';

const MAX_TOKENS = 320;
const TEMPERATURE = 0.7;

export async function refinePrompt(
  request: string,
  style: ImageAgentStyle,
): Promise<string> {
  const { system, user } = buildRefinePrompt(request, style);
  return runProviderFailover(
    buildTextChatProviders({ system, user, maxTokens: MAX_TOKENS, temperature: TEMPERATURE }),
    'description',
  );
}

export async function retryPrompt(
  request: string,
  style: ImageAgentStyle,
  previous: string,
  suggestions: string[],
): Promise<string> {
  const { system, user } = buildRetryPrompt(request, style, previous, suggestions);
  return runProviderFailover(
    buildTextChatProviders({ system, user, maxTokens: MAX_TOKENS, temperature: TEMPERATURE }),
    'description',
  );
}
