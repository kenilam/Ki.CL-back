import getDocument from './getDocument';

const auth = async () => {
  const { value: { auth } } = await getDocument({ '_id' : 'users' });

  return auth;
};

export default auth;
