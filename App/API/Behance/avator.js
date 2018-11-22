import request from 'request';

import Core from './Core';

import user from './user';

const route = '/api/avator';

const avator = async username => {
  username = username || await Core.username();

  const { images } = await user(username, true);

  const path = images[Math.max(...Object.keys(images))];

  return request(path);
}

export { route };
export default avator;
