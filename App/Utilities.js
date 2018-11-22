import timestamp from 'timestamp';

import config from '^/config.json';

const { allowedHosts, localhost, remotehost } = config;

const emptyRoute = (req, res) => {
  res.status(404).send('Nothing to See here!');
};

const env = process.env.NODE_ENV || 'production';

const hosts = allowedHosts[env];

const port = process.env.PORT || localhost.port;

const domain = env === 'production' ? remotehost.domain : `http://localhost:${port}`;

const oneDay = 24 * 60 * 60 * 1000;

export default { domain, emptyRoute, env, hosts, oneDay, timestamp, port };
