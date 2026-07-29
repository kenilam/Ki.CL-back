/**
 * One-shot: drop legacy unique ottId_1 (rejects multiple nulls) and
 * install partial unique index. Also unset explicit null ott/ancestor fields.
 *
 * Run: npx tsx --tsconfig tsconfig.json Server/Scripts/fixOttIdIndex.ts
 */
import 'dotenv/config';

import mongoose from 'mongoose';

async function main() {
  const uri = process.env.MONGODB_ATLAS_URI;
  if (!uri) {
    throw new Error('MONGODB_ATLAS_URI required');
  }

  await mongoose.connect(uri);
  const col = mongoose.connection.db!.collection('tree-of-life');

  const indexes = await col.indexes();
  console.log('Before:', indexes.map((idx) => ({
    name: idx.name,
    unique: idx.unique,
    key: idx.key,
    partial: idx.partialFilterExpression,
  })));

  for (const idx of indexes) {
    const isLegacyOtt =
      idx.name === 'ottId_1'
      || (
        idx.key?.ottId === 1
        && idx.unique
        && !idx.partialFilterExpression
        && idx.name !== 'ottId_unique_when_set'
      );
    if (isLegacyOtt && idx.name) {
      await col.dropIndex(idx.name);
      console.log('Dropped', idx.name);
    }
  }

  const unset = await col.updateMany(
    { $or: [{ ottId: null }, { ancestorOttId: null }] },
    [
      {
        $set: {
          ottId: {
            $cond: [{ $eq: ['$ottId', null] }, '$$REMOVE', '$ottId'],
          },
          ancestorOttId: {
            $cond: [{ $eq: ['$ancestorOttId', null] }, '$$REMOVE', '$ancestorOttId'],
          },
        },
      },
    ],
  );
  console.log('Unset null ott/ancestor fields:', unset.modifiedCount);

  try {
    await col.createIndex(
      { ottId: 1 },
      {
        name: 'ottId_unique_when_set',
        unique: true,
        partialFilterExpression: { ottId: { $type: 'number' } },
      },
    );
    console.log('Created ottId_unique_when_set');
  } catch (error) {
    console.log(
      'Index create:',
      error instanceof Error ? error.message : error,
    );
  }

  console.log('After:', (await col.indexes()).map((idx) => ({
    name: idx.name,
    unique: idx.unique,
    key: idx.key,
    partial: idx.partialFilterExpression,
  })));

  await mongoose.disconnect();
  console.log('Done!');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
