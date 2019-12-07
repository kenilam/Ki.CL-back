import getDocument from './getDocument';

const port = async () => {
  const { value } = await getDocument({ '_id' : 'port' });

  return value;
};

export default port;
