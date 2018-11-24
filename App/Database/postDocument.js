import { timestamp } from './Utilities';
import instance from './instance';

const postDocument = async (COLLECTION, _id, value) => {
  try {
    if (!_id) {
      throw new Error ('_id is required!');
    }

    const created_on = timestamp();

    const db = await instance.create();
    
    const collection = await db.collection(COLLECTION).insertOne(
      { _id, created_on, value }
    );

    const list = await collection.ops;

    if (!Boolean(list.length)) {
      return false;
    }

    return list.length > 1 ? list : list[0];
  } catch (error) {
    console.log(error.stack);
  }
}

export default postDocument;
