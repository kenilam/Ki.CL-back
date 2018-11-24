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
    const { result, http_code } = await user();

    res.status(http_code).send(result);
  });

  instance.get('/api/works', async (req, res) => {
    const { result, http_code } = await projects();

    res.status(http_code).send(result);
  });

  instance.get('/api/works/:projectId', async (req, res) => {
    const { result, http_code } = await project(req.params.projectId);

    res.status(http_code).send(result);
  });
};

export default data;
