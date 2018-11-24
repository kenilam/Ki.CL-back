import Database from '^/App/Database';

import { COLLECTION } from '^/App/API/Behance/Utilities';

const getDocument = async query => await Database.getDocument(COLLECTION, query);

export default getDocument;
