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

  static existigParamsFromRequest (req, paramName) {
    const { params } = req;

    if (!params || !params[paramName]) {
      return;
    }

    return params[paramName];
  }

  constructor () {
    super();

    this.avator = this.avator.bind(this);
    this.create = this.create.bind(this);
    this.experience = this.experience.bind(this);
    this.profile = this.profile.bind(this);
    this.profileAvator = this.profileAvator.bind(this);
    this.projects = this.projects.bind(this);
    this.project = this.project.bind(this);
    this.projectComments = this.projectComments.bind(this);
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
    instance.get('/api/profile/avator', this.profileAvator);

    instance.get('/api/projects', this.projects);
    instance.get('/api/projects/:projectId', this.project);
    instance.get('/api/projects/:projectId/comments', this.projectComments);

    instance.get('/api/users', this.empty);
    instance.get('/api/users/:username', this.user);
    instance.get('/api/users/:username/avator', this.avator);
    instance.get('/api/users/:username/experience', this.experience);
  }

  empty (req, res) {
    res.status(200).send('Nothing to See here!');
  }

  async avator (req, res) {
    const username = App.existigParamsFromRequest(req, 'username');

    if (!username) {
      return;
    }

    const { behance } = this.collections.api;

    const result = await behance.avator(username);

    result.pipe(res);
  }

  async experience (req, res) {
    const username = App.existigParamsFromRequest(req, 'username');
    
    if (!username) {
      return;
    }

    const { behance } = this.collections.api;

    const result = await behance.experience(username);

    res.status(200).send(result);
  }

  async profile (req, res) {
    const { behance } = this.collections.api;

    const username = await behance.username();

    req.params = { ...req.params, username };

    this.user(req, res);
  }

  async profileAvator (req, res) {
    const { behance } = this.collections.api;

    const username = await behance.username();

    req.params = { ...req.params, username };

    this.avator(req, res);
  }

  async projects (req, res) {
    const { behance } = this.collections.api;

    const username = await behance.username();

    const result = await behance.projects(username);

    res.status(200).send(result);
  }

  async project (req, res) {
    const { projectId } = req.params || {};

    if (!projectId) {
      return;
    }

    const { behance } = this.collections.api;

    let result = await behance.project(projectId);

    let status = 200;

    if (!result) {
      status = 404;

      result = 'No Such Project';
    }

    res.status(status).send(result);
  }

  async projectComments (req, res) {
    const { projectId } = req.params || {};

    if (!projectId) {
      return;
    }

    const { behance } = this.collections.api;

    let result = await behance.projectComments(projectId);

    let status = 200;

    if (!result || result.length === 0) {
      status = 404;
    }

    if (!result) {
      result = 'No Such Project';
    }

    if (result.length === 0) {
      result = 'No comments';      
    }

    res.status(status).send(result);
  }

  async user (req, res) {
    const username = App.existigParamsFromRequest(req, 'username');

    if (!username) {
      return;
    }

    const { behance } = this.collections.api;

    let result = await behance.user(username);

    let status = 200;

    if (!result) {
      status = 404;

      result = 'No Such User';
    }

    res.status(status).send(result);
  }
}

export default App;
