import getDocument from './getDocument';

const auth = async () => {
  const { value } = await getDocument({ '_id' : 'config' });

  return value;
};

export default auth;
