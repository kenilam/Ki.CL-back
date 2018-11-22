import getDocument from './getDocument';

const username = async () => {
  const { value } = await getDocument({ '_id' : 'username' });

  return value;
};

export default username;
