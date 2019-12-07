import getDocument from './getDocument';

const host = async () => {
  const { value } = await getDocument({ '_id' : 'host' });

  return value;
};

export default host;
