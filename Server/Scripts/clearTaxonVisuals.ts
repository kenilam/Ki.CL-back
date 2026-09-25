/**
 * Clear taxon-visual GCS objects + Assets rows, and strip visual fields from
 * tree-of-life (keeps OTOL topology so you don't re-fetch the whole tree).
 *
 * Run: npx tsx --tsconfig tsconfig.json Server/Scripts/clearTaxonVisuals.ts
 *
 * Pass `--wipe-tree` to also delete all tree-of-life documents.
 */
import 'dotenv/config';

import { connectDatabase, mongoose } from 'server/DataSources/MongoDB/index.js';

import { Assets } from 'server/DataSources/MongoDB/Assets/Model.js';
import { TreeOfLifeNodes } from 'server/DataSources/MongoDB/TreeOfLife/Model.js';
import { getBucket } from 'server/DataSources/Google/Storage/bucket.js';

const wipeTree = process.argv.includes('--wipe-tree');

async function clear() {
  await connectDatabase();

  const bucket = getBucket();
  const [files] = await bucket.getFiles();
  let deletedFiles = 0;

  await Promise.all(
    files.map(async (file) => {
      await file.delete({ ignoreNotFound: true });
      deletedFiles += 1;
      console.log(`  🗑  GCS ${file.name}`);
    }),
  );
  console.log(`✅ GCS objects deleted: ${deletedFiles}`);

  const assetsResult = await Assets.deleteMany({});
  console.log(`✅ MongoDB assets deleted: ${assetsResult.deletedCount}`);

  if (wipeTree) {
    const treeResult = await TreeOfLifeNodes.deleteMany({});
    console.log(`✅ MongoDB tree-of-life deleted: ${treeResult.deletedCount}`);
  } else {
    const cleared = await TreeOfLifeNodes.updateMany(
      {},
      {
        $set: {
          assetId: null,
          description: null,
          visualStatus: null,
          visualScore: null,
          prompt: null,
          error: null,
        },
        $unset: { imageUrl: 1 },
      },
    );
    console.log(
      `✅ tree-of-life visual fields cleared on ${cleared.modifiedCount} docs `
      + `(topology kept; use --wipe-tree to delete nodes)`,
    );
  }

  // Drop legacy collections if they still exist.
  for (const name of ['taxonvisuals', 'TreeOfLifeNodes']) {
    const collections = await mongoose.connection.db
      ?.listCollections({ name })
      .toArray() ?? [];
    if (collections.length) {
      await mongoose.connection.db!.dropCollection(name);
      console.log(`✅ Dropped legacy ${name} collection`);
    }
  }

  await mongoose.disconnect();
  console.log('Done!');
}

clear().catch((error) => {
  console.error(error);
  process.exit(1);
});
