import Database from '^/App/Database';

import { COLLECTION } from '^/App/API/Napster/Utilities';

const postDocument = async (_id, value) => Database.postDocument(COLLECTION, _id, value);

export default postDocument;
