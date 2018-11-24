import Database from '^/App/Database';

import { COLLECTION } from '^/App/API/Behance/Utilities';

const deleteDocument = async query => await Database.deleteDocument(COLLECTION, query);

export default deleteDocument;
