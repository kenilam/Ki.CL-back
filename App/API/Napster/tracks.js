import track from './track';

const tracks = async lists => {
  try {
    const result = await Promise.all(
      lists.map(
        async ({ id }) => await track(id)
      )
    );
    
    return result;
  } catch (error) {
    console.log(error.stack);
  }
}

export default tracks;
