import { hosts } from '^/App/Utilities';

const validateAccess = (req, res, next) => {
    const { headers, method } = req;
    const { host } = headers;

    if (
        !hosts.some(name => host.startsWith(name)) ||
        method !== 'GET'
    ) {
        res.status(401).send('Access not allow');

        return;
    }

    next();
}

export default validateAccess;
