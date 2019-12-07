import { emptyRoute } from '^/App/Utilities';
import { instance } from '^/App/Server';
import contact from './contact';
import data from './data';
import assets from './assets';

const create = () => {
  instance.get('/', emptyRoute);
  instance.get('/api', emptyRoute);

  contact();
  data();
  assets();
}

export default { create };
