import node_fetch from 'node-fetch';

import getDocument from './getDocument';
import postDocument from './postDocument';
import URI from './URI';

const fetch = async _id => {
  try {
    let { value } = await getDocument({ _id });

    if (!value) {
      const url = await URI(_id);

      value = await node_fetch(url).then(res => res.json());

      const data = await postDocument(_id, value);

      value = data.value;
    }

    return value;
  } catch (error) {
    console.log(error.stack);
  }
}

export default fetch;
