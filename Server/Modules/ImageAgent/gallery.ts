import { Assets, type IAsset } from 'server/DataSources/MongoDB/Assets/Model.js';
import { ImageAgentThreads } from 'server/DataSources/MongoDB/ImageAgentThreads/Model.js';
import { ImageAgentMessageKind } from 'server/Types/graphql.js';

/**
 * The best-scored pictures from every conversation, highest first. Pictures
 * that were never reviewed come last. Only the asset: no text, owner or
 * conversation.
 */
export async function galleryAssets(limit: number): Promise<IAsset[]> {
  return ImageAgentThreads.aggregate<IAsset>([
    { $unwind: '$messages' },
    {
      $match: {
        'messages.kind': ImageAgentMessageKind.Image,
        'messages.assetId': { $ne: null },
      },
    },
    { $group: { _id: '$messages.assetId', overall: { $max: '$messages.score.overall' } } },
    // A missing score sorts below any number, so unreviewed pictures go last.
    { $sort: { overall: -1, _id: 1 } },
    { $limit: limit },
    {
      $lookup: {
        from: Assets.collection.name,
        localField: '_id',
        foreignField: '_id',
        as: 'asset',
      },
    },
    { $unwind: '$asset' },
    { $replaceRoot: { newRoot: '$asset' } },
  ]);
}
