import fetch from 'node-fetch';

import Core from './Core';

class Behance extends Core {
  async profile () {
    const username = await this.username();
    const URI = await this.URI(`users/${username}`);
    const user = await this.user(username);

    return user;
  }
}

export default Behance;
