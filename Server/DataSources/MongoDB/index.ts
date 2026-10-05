import mongoose from 'mongoose';

export async function connectDatabase(): Promise<typeof mongoose> {
  const uri = process.env.MONGODB_ATLAS_URI;

  if (!uri) {
    throw new Error('MONGODB_ATLAS_URI environment variable is required');
  }

  try {
    // Without a name Mongo uses `test`, which development already holds.
    const connection = await mongoose.connect(uri, {
      dbName: process.env.MONGODB_DATABASE || 'test',
      retryWrites: true,
      w: 'majority',
    });

    console.log(`✅ MongoDB connected to ${connection.connection.name}`);
    return connection;
  } catch (error) {
    console.error('❌ MongoDB connection failed:', error);
    throw error;
  }
}

const PING_TIMEOUT_MS = 2000;

/**
 * Whether the primary answers. A driver that has lost the primary stays
 * connected and fails every query after 30 seconds of server selection, so the
 * connection state alone doesn't show it.
 */
export async function pingPrimary(): Promise<boolean> {
  const { db } = mongoose.connection;

  if (!db) {
    return false;
  }

  try {
    await db.command(
      { ping: 1 },
      { readPreference: 'primary', timeoutMS: PING_TIMEOUT_MS },
    );
    return true;
  } catch (error) {
    console.error('❌ MongoDB primary did not answer:', error);
    return false;
  }
}

export { mongoose };
