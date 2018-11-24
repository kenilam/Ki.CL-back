import Core from '^/App/API/Behance/Core';

import modify from './modify';

const user = async (username, keepOrigin) => {
  username = username || await Core.username();
  
  try {
    let { user, http_code } = await Core.fetch(`users/${username}`);

    user = user && await modify(user, keepOrigin);

    return { result : user, http_code };
  } catch (error) {
    console.log(error.stack);
  }
}

export { modify };
export default user;
