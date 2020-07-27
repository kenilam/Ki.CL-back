import express from 'express';

import bodyParser from 'body-parser';

import fs from 'fs';
import https from 'https';
import { path as appRoot } from 'app-root-path';

import { port } from '^/App/Utilities';

import validateAccess from './validateAccess';

const key = fs.readFileSync(`${appRoot}/App/Server/Certs/server.key`, 'utf8');
const cert = fs.readFileSync(`${appRoot}/App/Server/Certs/server.crt`, 'utf8');

const instance = express();
const options = { key, cert };

const server = https.createServer(options, instance);

const start = () => {
    server.listen(port);

    console.log(`Backend is now running on port ${port}`);
}

instance.use(validateAccess);
instance.use(bodyParser.json());

export default { instance, start };
