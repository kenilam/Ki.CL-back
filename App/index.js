import express from 'express';
import bodyParser from 'body-parser';

import Database from './Database';

const instance = express();

class App {
  static get PORT () {
    return 3100;
  }

  constructor () {
    this.create = this.create.bind(this);
    this.profile = this.profile.bind(this);

    this.database = new Database();
    
    this.routes();
  }

  async create () {
    this.collections = await this.database.connect();
    
    const server = await instance.listen(process.env.PORT || App.PORT);

    return server;
  }

  routes () {
    instance.use(bodyParser.json());
    instance.get('/', this.root);
    instance.get('/profile', this.profile);
  }

  root (req, res) {
    res.status(200).send('woohoo!');
  }

  async profile (req, res) {
    const { behance } = this.collections.api;

    const profile = await behance.profile();

    res.status(200).send(profile);
  }
}

export default App;
