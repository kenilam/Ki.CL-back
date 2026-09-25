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

export { mongoose };
