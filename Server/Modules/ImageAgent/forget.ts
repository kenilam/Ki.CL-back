import { Storage } from 'server/DataSources/Google/index.js';
import { Assets } from 'server/DataSources/MongoDB/Assets/Model.js';
import { ImageAgentJobs } from 'server/DataSources/MongoDB/ImageAgentJobs/Model.js';
import { ImageAgentThreads } from 'server/DataSources/MongoDB/ImageAgentThreads/Model.js';

/** The agent's objects in the bucket, as `persistImage` names them. */
const OBJECT = /\/taxon-visual\/(agent\/[^/?#]+)/;

/**
 * Removes everything the agent kept for one owner: the conversations, the
 * drawings behind them and the pictures themselves.
 *
 * The quotas are counted from these rows, so the service's daily counts drop
 * by what this owner used. A deleted account's own allowance no longer
 * matters, because its UserGUID is never used again.
 */
export async function forgetOwner(ownerGUID: string): Promise<void> {
  const [fromThreads, fromJobs] = await Promise.all([
    ImageAgentThreads.distinct('messages.assetId', { ownerGUID }),
    ImageAgentJobs.distinct('assetId', { ownerGUID }),
  ]);

  const assetIds = [...fromThreads, ...fromJobs].filter(Boolean);
  const assets = await Assets.find({ _id: { $in: assetIds } }, 'url');

  // A picture left in the bucket is still served at its URL, so a failure is logged, not hidden.
  await Promise.all(
    assets.map(async ({ url }) => {
      const name = OBJECT.exec(url)?.[1];

      if (name) {
        await Storage.deleteObject(name).catch((error) =>
          console.error(`ImageAgent: ${name} was not removed from the bucket`, error),
        );
      }
    }),
  );

  await Assets.deleteMany({ _id: { $in: assetIds } });
  await ImageAgentJobs.deleteMany({ ownerGUID });
  await ImageAgentThreads.deleteMany({ ownerGUID });
}
