import { hosts } from '^/App/Utilities';

import cors from 'cors';

const corsOptions = {
  origin : function (origin, callback) {
    if (origin === undefined || hosts.some(host => hist === origin)) {
      callback(null, true)
    } else {
      callback(new Error('Not allowed by CORS'))
    }
  }
}

export default { cors : cors(corsOptions) };
