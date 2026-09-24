import { PubSub } from 'graphql-subscriptions';

import type { ImageAgentThreadResult } from './types.js';

/** In-process bus - fine for one instance; swap for Redis to scale out. */
export const imageAgentPubSub = new PubSub<{
  IMAGE_AGENT_THREAD_UPDATED: { ImageAgentThreadUpdated: ImageAgentThreadResult };
}>();

export const IMAGE_AGENT_THREAD_UPDATED = 'IMAGE_AGENT_THREAD_UPDATED' as const;

export function publishImageAgentThreadUpdated(thread: ImageAgentThreadResult): void {
  void imageAgentPubSub.publish(IMAGE_AGENT_THREAD_UPDATED, {
    ImageAgentThreadUpdated: thread,
  });
}
