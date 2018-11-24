import config from '^/config.json';

const { allowedHosts, localhost, remotehost } = config;

const emptyRoute = (req, res) => {
  res.status(404).send('Nothing to See here!');
};

const env = process.env.NODE_ENV || 'production';

const hosts = allowedHosts[env];

const port = process.env.PORT || localhost.port;

const domain = env === 'production' ? remotehost.domain : `http://localhost:${port}`;

export default { domain, emptyRoute, env, hosts, port };
