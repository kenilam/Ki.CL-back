import { hosts } from '^/App/Utilities';

const validateAccess = (req, res, next) => {
  const { headers, method } = req;
  const { origin } = headers;

  if ( origin === undefined || hosts.some(name => origin.startsWith(name)) ) {
    res.header('Access-Control-Allow-Origin', origin);
  }

  res.header('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, Content-Length, X-Requested-With');
  res.header('Access-Control-Allow-Credentials', true);

  // intercept OPTIONS method
  if (req.method === 'OPTIONS') {
    res.send(200);
    return;
  }

  next();
}

export default validateAccess;
