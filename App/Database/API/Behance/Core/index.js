import fetch from 'node-fetch';
import request from 'request';

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

    const avator = user.images[Math.max(...Object.keys(user.images))];

    const experience = await this.experience(username);

    delete user.images;
    delete user.id;
    delete user.username;
    delete user.has_social_links;
    delete user.stats;
    delete user.links;
    delete user.twitters;

    return { ...user, avator, experience };
  }

  async avator (username) {
    const { avator } = await this.user(username);

    return request(avator);
  }

  async experience (username) {
    const URI = await this.URI(`users/${username}/work_experience`);

    const { work_experience } = await fetch(URI).then(res => res.json());

    return work_experience;
  }
}

export default Core;
