import fetch from 'node-fetch';

class Core {
  static get COLLECTION () {
    return 'behance';
  }

  constructor (database) {
    this.database = database;
  }

  async document (query) {
    try {
      const doc = await this.database.collection(Core.COLLECTION).find(query);

      const list = await doc.toArray();

      return list.length > 1 ? list.map(data => data.value) : list[0].value;
    } catch (error) {
      console.log(error.stack);
    }
  }

  async URI (path) {
    const api_key = await this.api_key();

    const url = await this.document({ '_id': 'URI' });

    return `${url}${path}?api_key=${api_key}`;
  }

  async api_key () {
    const key = await this.document({ '_id': 'api_key' });

    return key;
  }

  async username () {
    const api_key = await this.api_key();

    const username = await this.document({ '_id': 'username' });

    return username;
  }

  async user (username) {
    const URI = await this.URI(`users/${username}`);

    const { user } = await fetch(URI).then(res => res.json());

    return user;
  }
}

export default Core;
