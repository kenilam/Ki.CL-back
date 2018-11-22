import Core from '^/App/API/Behance/Core';

import { assets } from './Utilities';

import cover, { route as coverRoute } from './cover';
import src, { route as srcRoute } from './src';
import modify from './modify';

const routes = {
  assets,
  src : srcRoute,
  cover : coverRoute
}

const project = async (projectId, keepOrigin) => {
  try {
    let { project } = await Core.fetch(`projects/${projectId}`);

    project = modify(project, keepOrigin);

    return project;
  } catch (error) {
    console.log(error.stack);
  }
}

export { cover, src, routes };
export default project;
