import { PubSub } from 'graphql-subscriptions';

import type { ReadingResult } from './result.js';

export const kineticLightPubSub = new PubSub<{
  KINETIC_LIGHT_READING_UPDATED: { kineticLightReadingUpdated: ReadingResult };
}>();

export const KINETIC_LIGHT_READING_UPDATED = 'KINETIC_LIGHT_READING_UPDATED' as const;

export function publishReadingUpdated(reading: ReadingResult): void {
  void kineticLightPubSub.publish(KINETIC_LIGHT_READING_UPDATED, {
    kineticLightReadingUpdated: reading,
  });
}
