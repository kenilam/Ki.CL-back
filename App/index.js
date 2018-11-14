import express from 'express';
import bodyParser from 'body-parser';

import Database from './Database';

const app = express();

const PORT = 3100;

class App {
  constructor (collections) {
    this.collections = collections;

    this.profile = this.profile.bind(this);

    this.database = new Database();
  }

  async create () {
    const server = await app.listen(process.env.PORT || PORT);

    this.collections = await this.database.connect();

    app.use(bodyParser.json());

    app.get('/profile', this.profile);

    return server;
  }

  async profile (req, res) {
    const { behance } = this.collections.api;

    const profile = await behance.profile();

    res.status(200).send(profile);
  }
}

export default App;
