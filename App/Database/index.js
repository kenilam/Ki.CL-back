import mongodb from 'mongodb';

import API from './API';

const { MongoClient } = mongodb;

class Database {
  static get URI () {
    return process.env.MONGODB_URI || 'mongodb://localhost:27017/ki-cl';
  }

  static get config () {
    return {
      useNewUrlParser: true
    };
  }

  constructor () {
    this.connect = this.connect.bind(this);
  }

  async connect () {
    const { config, URI } = Database;

    try {
      const client = await MongoClient.connect(URI, config);

      const database = await client.db();

      const api = new API(database);

      return { api };
    } catch (error) {
      console.log(error.stack);
    }
  }
}

export default Database;
