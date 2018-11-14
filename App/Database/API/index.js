import Behance from './Behance';

export { Behance };


class API {
  constructor (database) {
    return {
      behance : new Behance(database)
    }
  }
}

export default API;
