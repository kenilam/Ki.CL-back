import express from 'express';
import bodyParser from 'body-parser';

import Utilities from './Utilities';
import Database from './Database';

const instance = express();

class App extends Utilities {
  static validateAccess (req, res, next) {
    const { headers, method } = req;
    const { host } = headers;

    if (
      !App.allowedHosts.some(name => host.startsWith(name)) ||
      method !== 'GET'
    ) {
      res.status(401).send('Access not allow');

      return;
    }

    next();
  }

  static requestedUsername (req) {
    const { params } = req;
    const { username } = params || {};

    if (!params || !username) {
      return;
    }

    return username;
  }

  constructor () {
    super();

    this.create = this.create.bind(this);
    this.experience = this.experience.bind(this);
    this.profile = this.profile.bind(this);
    this.user = this.user.bind(this);

    this.database = new Database();
    
    this.routes();
  }

  async create () {
    this.collections = await this.database.connect();
    
    const server = await instance.listen(App.port);

    return server;
  }

  routes () {
    instance.use(bodyParser.json());
    instance.use(App.validateAccess);

    instance.get('/', this.empty);
    instance.get('/api', this.empty);
    instance.get('/api/profile', this.profile);
    instance.get('/api/user', this.empty);
    instance.get('/api/user/:username', this.user);
    instance.get('/api/user/:username/experience', this.experience);
  }

  empty (req, res) {
    res.status(200).send('Nothing to See here!');
  }

  async profile (req, res) {
    const { behance } = this.collections.api;

    const username = await behance.username();

    req.params = { ...req.params, username };

    const user = await this.user(req, res);

    res.status(200).send(user);
  }

  async experience (req, res) {
    const username = App.requestedUsername(req);
    
    if (!username) {
      return;
    }

    const { behance } = this.collections.api;

    const experience = await behance.experience(username);

    res.status(200).send(experience);
  }

  async user (req, res) {
    const username = App.requestedUsername(req);

    if (!username) {
      return;
    }

    const { behance } = this.collections.api;

    const user = await behance.user(username);

    res.status(200).send(user);
  }
}

export default App;
