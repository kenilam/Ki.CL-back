import request from 'request';
import { Readable } from 'stream';

const COLLECTION = 'behance';

const image = async url => {
  if (!url) {
    const stream = new Readable();

    stream.push('No such image');
    stream.push(null);

    return stream;
  }

  return request(url);
}

export default { COLLECTION, image };
