import node_fetch from 'node-fetch';

import { isOutdated } from '^/App/Database/Utilities';

import deleteDocument from './deleteDocument';
import getDocument from './getDocument';
import postDocument from './postDocument';
import URI from './URI';

const createNewDocument = async _id => {
  const { options, url } = await URI();
  
  const value = await node_fetch(
    `${url}${_id.replace(url, '')}`, options
  ).then(res => res.json());

  await deleteDocument({ _id });
  
  return await postDocument(_id, value);
}

const fetch = async _id => {
  try {
    let data = await getDocument({ _id });

    if (!data || isOutdated(data.created_on)) {
      data = await createNewDocument(_id);
    }

    if (data.valid === 0) {
      return false;
    }
    
    return data.value;
  } catch (error) {
    console.log(error.stack);
  }
}

export default fetch;
