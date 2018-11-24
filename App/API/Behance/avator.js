import { image } from '^/App/API/Behance/Utilities';

import Core from './Core';

import user from './user';

const route = '/api/assets/avator';

const avator = async username => {
  try {
    username = username || await Core.username();

    const { result } = await user(username, true);
    const { images } = result;
    const path = images && images[Math.max(...Object.keys(images))];
      
    return await image(path);
  } catch (error) {
    console.log(error.stack);
  }
}

export { route };
export default avator;
