import { emptyRoute } from '^/App/Utilities';
import { Behance } from '^/App/API';
import { instance } from '^/App/Server';

import * as avatorConfig from '^/App/API/Behance/avator';
import * as projectConfig from '^/App/API/Behance/project';

const { projects, project, user } = Behance;

const data = () => {
  instance.get('/', emptyRoute);

  instance.get('/api', emptyRoute);

  instance.get('/api/about', async (req, res) => {
    const result = await user();

    res.status(200).send(result);
  });

  instance.get('/api/works', async (req, res) => {
    const result = await projects();

    res.status(200).send(result);
  });

  instance.get('/api/works/:projectId', async (req, res) => {
    const result = await project(req.params.projectId);

    res.status(200).send(result);
  });
};

export default data;
