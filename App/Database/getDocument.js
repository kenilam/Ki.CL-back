import instance from './instance';

const getDocument = async (COLLECTION, query) => {
  try {
    const db = await instance.create();

    const collection = await db.collection(COLLECTION).find(query);

    const list = await collection.toArray();

    if (!Boolean(list.length)) {
      return false;
    }

    return list.length > 1 ? list : list[0];
  } catch (error) {
    console.log(error.stack);
  }
}

export default getDocument;
