import request from 'request';
import { Readable } from 'stream';

const file = async url => {
  if (!url) {
    const stream = new Readable();
    
    stream.push('No such file');
    stream.push(null);
    
    return stream;
  }
  
  return request(url);
}

export default { file };
