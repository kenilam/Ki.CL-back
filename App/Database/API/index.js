import Behance from './Behance';

class API {
  constructor (database) {
    return {
      behance : new Behance(database)
    }
  }
}

export default API;
