import { hosts } from '^/App/Utilities';

const validateAccess = (req, res, next) => {
  const { headers, method } = req;
  const { origin } = headers;

  console.log(origin);

  if ( origin === undefined || hosts.some(name => origin.startsWith(name)) ) {
    res.header('Access-Control-Allow-Origin', origin);
  }

  res.header('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.header('Access-Control-Allow-Credentials', true);

  next();
}

export default validateAccess;
