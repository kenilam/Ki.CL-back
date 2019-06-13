import { emptyRoute } from '^/App/Utilities';
import { instance } from '^/App/Server';

import avator, { route as avatorRoute } from '^/App/API/Behance/avator';
import sound, { route as soundRoute } from '^/App/API/Napster/sound';

import {
  cover as projectCover,
  src as projectSrc,
  routes as projectRoutes,
} from '^/App/API/Behance/project';

const assets = () => {
  instance.get(avatorRoute, async (req, res) => {
    const result = await avator();

    result.pipe(res);
  });

  instance.get(projectRoutes.assets, emptyRoute);

  instance.get(projectRoutes.cover, async (req, res) => {
    const result = await projectCover(req.params);

    result.pipe(res);
  });

  instance.get(projectRoutes.src, async (req, res) => {
    const result = await projectSrc(req.params);

    result.pipe(res);
  });
  
  instance.get(`${soundRoute}:id`, async (req, res) => {
    const { id } = req.params;
    
    const result = await sound(id);
    
    result.pipe(res);
  });
  
  instance.post(`${soundRoute}:id`, async (req, res) => {
    const { id } = req.params;
    
    const result = await sound(id);
    
    result.pipe(res);
  });
};

export default assets;
