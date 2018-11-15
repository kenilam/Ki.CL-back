import config from '^/config.json';

const { allowedHosts, localhost } = config;

const { NODE_ENV, PORT } = process.env;

class Utilities {
    static get allowedHosts () {
        return allowedHosts[Utilities.env];
    };

    static get env () {
        return NODE_ENV || 'production';
    }

    static get port () {
        return PORT || localhost.port;
    }
}

export default Utilities;
