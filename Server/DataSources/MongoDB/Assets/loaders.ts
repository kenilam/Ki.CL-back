import DataLoader from 'dataloader';
import { Types } from 'mongoose';

import { Assets, type IAsset } from './Model.js';

export type LeanAsset = Pick<IAsset, '_id' | 'url' | 'generator'>;

async function batchAssetsById(
  ids: readonly string[],
): Promise<Array<LeanAsset | null>> {
  const objectIds = ids
    .filter((id) => Types.ObjectId.isValid(id))
    .map((id) => new Types.ObjectId(id));

  const docs = objectIds.length
    ? await Assets.find({ _id: { $in: objectIds } }).lean<LeanAsset[]>()
    : [];

  const byId = new Map(docs.map((doc) => [String(doc._id), doc]));
  return ids.map((id) => byId.get(id) ?? null);
}

export type AssetLoaders = {
  byId: DataLoader<string, LeanAsset | null>;
};

export function createAssetLoaders(): AssetLoaders {
  return {
    byId: new DataLoader(batchAssetsById, { cache: true }),
  };
}
