import express from 'express';

import { port } from '^/App/Utilities';

import validateAccess from './validateAccess';

const instance = express();

const start = () => {
    instance.listen(port);

    console.log(`Backend is now running on port ${port}`);
}

instance.use(validateAccess);
// instance.use(bodyParser.json());

export default { instance, start };
