import { KineticLightReadings } from 'server/DataSources/MongoDB/KineticLightReadings/Model.js';
import { notify, text } from 'server/DataSources/MongoDB/Notifications/notify.js';
import { KineticLightStage, KineticLightStatus } from 'server/Types/graphql.js';
import type { ReadingResult } from './result.js';

const READINGS = KineticLightReadings.collection.collectionName;

type Reading = Pick<ReadingResult, 'bars' | 'chords' | 'failure' | 'id' | 'notes' | 'ownerGUID' | 'stage' | 'status' | 'title'>;

function messageOf({ bars, chords, failure, notes, stage, status }: Reading) {
  if (status === KineticLightStatus.Failed) {
    return text('api:kinetic_light_error', { context: failure ?? 'unavailable' });
  }

  if (status === KineticLightStatus.Ready) {
    return text('ready_to_play');
  }

  if (chords.length) {
    return text('found', { context: 'chords', count: chords.length });
  }

  if (stage === KineticLightStage.Chords && notes && bars) {
    return text('found', { bars, context: 'notes', count: notes });
  }

  return text('progress', { context: stage === KineticLightStage.Chords ? 'chords' : 'notes' });
}

export async function notifyReading(reading: Reading): Promise<void> {
  if (!reading.ownerGUID) {
    return;
  }

  await notify(reading.ownerGUID, READINGS, reading.id, {
    title: text('notification_title', { title: reading.title }),
    message: messageOf(reading),
  });
}
