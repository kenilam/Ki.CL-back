import { hosts } from '^/App/Utilities';

const validateAccess = (req, res, next) => {
  const { headers, method } = req;
  const { host, origin } = headers;
  
  if (headers.range) {
    console.log(headers.range);
  }

  if (hosts.some(name => (origin || host).startsWith(name)) ) {
    res.header('Access-Control-Allow-Origin', origin);
  }

  res.header('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
  res.header(
    'Access-Control-Allow-Headers',
    'Content-Type, Authorization, Content-Length, X-Requested-With'
  );
  res.header('Access-Control-Allow-Credentials', true);

  // intercept OPTIONS method
  if (method === 'OPTIONS') {
    res.sendStatus(200);
    return;
  }

  next();
}

export default validateAccess;
