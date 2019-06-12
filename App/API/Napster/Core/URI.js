import { Headers } from 'node-fetch';

import api_key from './api_key';
import getDocument from './getDocument';

const URI = async () => {
  try {
    const apikey = await api_key();

    const { value: url } = await getDocument({ '_id' : 'URI' });
    
    const headers = new Headers({ apikey });
    
    const options = { method: 'GET', headers };
    
    return { options, url };
  } catch (error) {
    console.log(error.stack);
  }
};

export default URI;
