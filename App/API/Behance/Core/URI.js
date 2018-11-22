import api_key from './api_key';
import getDocument from './getDocument';

const URI = async _id => {
  try {
    const key = await api_key();

    const { value } = await getDocument({ '_id' : 'URI' });

    return `${value}${_id}?api_key=${key}`;
  } catch (error) {
    console.log(error.stack);
  }
};

export default URI;
