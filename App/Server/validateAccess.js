import { hosts } from '^/App/Utilities';

const validateAccess = (req, res, next) => {
  const { headers, method } = req;
  const { host } = headers;

  if ( !hosts.some(name => host.startsWith(name)) ) {
    res.setHeader('Access-Control-Allow-Origin', host);
  }

  res.header('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.header('Access-Control-Allow-Credentials', true);

  next();
}

export default validateAccess;
