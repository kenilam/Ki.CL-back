import instance from './instance';

const deleteDocument = async (COLLECTION, query) => {
  try {
    const db = await instance.create();

    return await db.collection(COLLECTION).deleteMany(query);
  } catch (error) {
    console.log(error.stack);
  }
}

export default deleteDocument;
