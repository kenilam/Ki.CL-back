import {
  KineticLightFailure,
  KineticLightReadings,
} from 'server/DataSources/MongoDB/KineticLightReadings/Model.js';
import { KineticLightStatus } from 'server/Types/graphql.js';

const STALLED_MS = 10 * 60 * 1000;

export async function recoverStalled(ownerGUID: string): Promise<void> {
  await KineticLightReadings.updateMany(
    {
      ownerGUID,
      status: KineticLightStatus.Reading,
      createdAt: { $lt: new Date(Date.now() - STALLED_MS) },
    },
    { status: KineticLightStatus.Failed, stage: null, failure: KineticLightFailure.Unavailable },
  );
}
