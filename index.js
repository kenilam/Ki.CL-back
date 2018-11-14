import express from 'express';
import bodyParser from 'body-parser';
import mongodb from 'mongodb';

import Services from '^/Services';

const { objectID } = mongodb;

const app = express();

const PORT = 3100;

const handleError = (res, reason, message, code) => {
  console.log(`ERROR: ${reason}`);
  res.status(code || 500).json({'error': message});
}

let database;
let services;

app.use(bodyParser.json());

mongodb.MongoClient.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/ki-cl', async (error, client) => {
  if (error) {
    console.log(error);
    process.exit(1);
  }

  database = client.db();
  services = new Services(database);
  
  console.log("Database connection ready");

  const server = await app.listen(process.env.PORT || PORT);

  console.log(`App now running on port ${server.address().port}`);
});

app.get('/api/key', async (req, res) => {
  const api_key = await services.api_key();

  res.status(200).json(api_key);
});

app.get('/api/profile', (req, res) => {
  services.profile().then(key => {
    res.status(200).json(key);
  });
});
