import express from 'express';
import bodyParser from 'body-parser';

import { port } from '^/App/Utilities';

import validateAccess from './validateAccess';

const instance = express();

const start = () => {
    instance.listen(port);

    console.log(`Backend is now running on port ${port}`);
}

instance.use(bodyParser.json());
instance.use(validateAccess);

export default { instance, start };
