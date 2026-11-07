import {
  KineticLightFailure,
  KineticLightReadings,
} from 'server/DataSources/MongoDB/KineticLightReadings/Model.js';
import { KineticLightStatus } from 'server/Types/graphql.js';
import { notifyReading } from './notify.js';
import { toResult } from './result.js';

const STALLED_MS = 10 * 60 * 1000;

export async function recoverStalled(ownerGUID: string): Promise<void> {
  const stalled = await KineticLightReadings.find({
    ownerGUID,
    status: KineticLightStatus.Reading,
    createdAt: { $lt: new Date(Date.now() - STALLED_MS) },
  }).lean();

  await Promise.all(
    stalled.map(async ({ _id }) => {
      const reading = await KineticLightReadings.findOneAndUpdate(
        { _id, status: KineticLightStatus.Reading },
        { status: KineticLightStatus.Failed, stage: null, failure: KineticLightFailure.Unavailable },
        { new: true },
      ).lean();

      if (reading) {
        await notifyReading(toResult(reading));
      }
    }),
  );
}
