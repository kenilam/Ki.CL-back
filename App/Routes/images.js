import { emptyRoute } from '^/App/Utilities';
import { Behance } from '^/App/API';
import { instance } from '^/App/Server';

import * as avatorConfig from '^/App/API/Behance/avator';
import * as projectConfig from '^/App/API/Behance/project';

const { avator } = Behance;

const images = () => {
  instance.get(avatorConfig.route, async (req, res) => {
    const result = await avator();

    result.pipe(res);
  });

  instance.get(projectConfig.routes.assets, emptyRoute);

  instance.get(projectConfig.routes.cover, async (req, res) => {
    const result = await projectConfig.cover(req.params);

    result.pipe(res);
  });

  instance.get(projectConfig.routes.src, async (req, res) => {
    const result = await projectConfig.src(req.params);

    result.pipe(res);
  });
};

export default images;
