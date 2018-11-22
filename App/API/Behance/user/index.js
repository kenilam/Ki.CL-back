import Core from '^/App/API/Behance/Core';

import modify from './modify';

const user = async (username, keepOrigin) => {
  username = username || await Core.username();
  
  try {
    let { user } = await Core.fetch(`users/${username}`);

    user = await modify(user, keepOrigin);

    return user;
  } catch (error) {
    console.log(error.stack);
  }
}

export { modify };
export default user;
