import data from './data';
import images from './images';

import { Pinterest } from '^/App/API';

const create = () => {
  images();
  data();

  Pinterest();
}

export default { create };
