import Database from '^/App/Database';

import { COLLECTION } from '^/App/API/Behance/Utilities';

const postDocument = async (_id, value) => {
  const doc = await Database.postDocument(COLLECTION, _id, value);

  return doc;
};

export default postDocument;
