import { domain } from '^/App/Utilities';

import { image } from '^/App/API/Behance/Utilities';

import { assets } from './Utilities';

import project from './index';

const route = `${assets}/cover`;

const path = projectId => {
  return `${domain}${route.replace(/:projectId/g, projectId)}`;
}

const cover = async ({ projectId }) => {
  try {
    const { result } = await project(projectId, true);
    const { covers, modules } = result;
    const module = modules.filter(module => module.type === 'image' )[0];
    const { original } = covers;
    
    return await image(module ? module.src : original);
  } catch (error) {
    console.log(error.stack);
  }
}

export { route, path };
export default cover;
