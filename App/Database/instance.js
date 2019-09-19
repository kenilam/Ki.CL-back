import mongodb from 'mongodb';

const { MongoClient } = mongodb;

const URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/ki-cl';

const config = { useNewUrlParser: true, useUnifiedTopology: true };

let client;
let instance;

const create = async () => {
  try {
    if (!instance) {
      client = await MongoClient.connect(URI, config);
      instance = await client.db();

      console.log(`Database initialised!`);
    }

    return instance;
  } catch (error) {
    console.log(error.stack);
  }
}

export default { create };
