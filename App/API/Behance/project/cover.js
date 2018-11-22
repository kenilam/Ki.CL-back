import { domain } from '^/App/Utilities';

import { image } from '^/App/API/Behance/Utilities';

import { assets } from './Utilities';

import project from './index';

const route = `${assets}/cover`;

const path = projectId => {
  return `${domain}${route.replace(/:projectId/g, projectId)}`;
}

const cover = async ({ projectId }) => {
  const { covers } = await project(projectId, true);
  const { original } = covers;

  const stream = await image(original);

  return stream;
}

export { route, path };
export default cover;
