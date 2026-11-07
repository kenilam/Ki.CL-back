import type { Types, UpdateQuery } from 'mongoose';

import {
  KineticLightFailure,
  KineticLightReadings,
  type IKineticLightReading,
} from 'server/DataSources/MongoDB/KineticLightReadings/Model.js';
import { KineticLightStage, KineticLightStatus } from 'server/Types/graphql.js';
import { notifyReading } from './notify.js';
import { readNotes, type Sheet } from './omr.js';
import { publishReadingUpdated } from './pubsub.js';
import { readChords, type Chords } from './read.js';
import { toResult } from './result.js';

function settled<T>(result: PromiseSettledResult<T>, reader: string, name: string): T | null {
  if (result.status === 'fulfilled') {
    return result.value;
  }

  console.error(`[KineticLight] ${reader} could not read "${name}": ${(result.reason as Error).message}`);

  return null;
}

const CLEARED = { stage: null, tempo: null, chords: [] };

function finish(
  sheet: PromiseSettledResult<Sheet | null>,
  model: PromiseSettledResult<Chords>,
  notes: Sheet | null,
  chords: Chords | null,
): UpdateQuery<IKineticLightReading> {
  if (sheet.status === 'rejected' && model.status === 'rejected') {
    return { ...CLEARED, status: KineticLightStatus.Failed, failure: KineticLightFailure.Unavailable };
  }

  if (!notes && !chords?.chords.length) {
    return { ...CLEARED, status: KineticLightStatus.Failed, failure: KineticLightFailure.NoMusic };
  }

  return {
    ...(chords?.title ? { title: chords.title } : {}),
    status: KineticLightStatus.Ready,
    stage: null,
    musicxml: notes?.musicxml ?? null,
    tempo: chords?.tempo ?? null,
    beatsPerBar: chords?.beatsPerBar ?? null,
    chords: chords?.chords ?? [],
  };
}

export async function runReading(id: Types.ObjectId, name: string, bytes: Buffer, mime: string): Promise<void> {
  let saving = Promise.resolve();
  let shown = '';

  const save = (update: UpdateQuery<IKineticLightReading>) => {
    saving = saving
      .then(async () => {
        const reading = await KineticLightReadings
          .findOneAndUpdate({ _id: id, status: KineticLightStatus.Reading }, update, { new: true })
          .lean();

        if (reading) {
          publishReadingUpdated(toResult(reading));
          await notifyReading(toResult(reading));
        }
      })
      .catch((error: Error) => {
        console.error(`[KineticLight] "${name}" could not be saved: ${error.message}`);
      });

    return saving;
  };

  const progress = (partial: Partial<Chords>) => {
    const key = `${partial.title ?? ''}|${partial.chords?.length ?? 0}`;

    if (key === shown) {
      return;
    }

    shown = key;
    void save({
      ...(partial.title ? { title: partial.title } : {}),
      tempo: partial.tempo ?? null,
      chords: partial.chords ?? [],
    });
  };

  const [sheet] = await Promise.allSettled([readNotes(bytes, mime)]);
  const notes = settled(sheet, 'The sheet reader', name);

  void save({
    stage: KineticLightStage.Chords,
    bars: notes?.lines.reduce((sum, count) => sum + count, 0) ?? null,
    notes: notes?.notes ?? null,
  });

  const [model] = await Promise.allSettled([readChords(name, bytes, mime, notes?.lines, progress)]);
  const chords = settled(model, 'The chord model', name);

  await save(finish(sheet, model, notes, chords));
}
