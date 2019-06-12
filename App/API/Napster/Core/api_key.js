import getDocument from './getDocument';

const api_key = async () => {
  const { value } = await getDocument({ '_id' : 'api_key' });

  return value;
};

export default api_key;
