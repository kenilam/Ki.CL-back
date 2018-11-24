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
    const { covers } = result;
    const { original } = covers;
    
    return await image(original);
  } catch (error) {
    console.log(error.stack);
  }
}

export { route, path };
export default cover;
