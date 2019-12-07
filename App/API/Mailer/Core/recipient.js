import getDocument from './getDocument';

const recipient = async () => {
  const { value: { recipient } } = await getDocument({ '_id' : 'users' });

  return recipient;
};

export default recipient;
