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

  async fetch (URI) {
    try {
      const data = await fetch(URI).then(res => res.json());

      if (data.http_code) {
        console.error(data);
      }

      return data;
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
    const username = await this.document({ '_id': 'username' });

    return username;
  }
}

export default Core;
