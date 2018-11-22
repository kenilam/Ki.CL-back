import Database from '^/App/Database';

import { COLLECTION } from '^/App/API/Behance/Utilities';

const getDocument = async query => {
  const doc = await Database.getDocument(COLLECTION, query);

  return doc;
};

export default getDocument;
