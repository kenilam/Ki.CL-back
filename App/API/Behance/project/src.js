import { domain } from '^/App/Utilities';

import { image } from '^/App/API/Behance/Utilities';

import { assets } from './Utilities';

import project from './index';

const route = `${assets}/:srcId`;

const path = (projectId, srcId) => {
  return `${domain}${route
    .replace(/:projectId/g, projectId)
    .replace(/:srcId/g, srcId)
  }`;
}

const src = async ({ projectId, srcId }) => {
  const { result } = await project(projectId, true);
  const { modules } = result;
  const { sizes, src } = modules[srcId] || {};

  const { original } = sizes || {};

  const stream = await image(original);

  return stream;
}

export { route, path };
export default src;
