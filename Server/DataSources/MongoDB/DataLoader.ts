import { composeMongoose } from 'graphql-compose-mongoose';
import { schemaComposer } from 'graphql-compose';
import { Users } from './Users/Model.js';

const IGNORED_FIELDS = ['Password', 'SocialProviders'];

const UsersTC = composeMongoose(Users, {
  removeFields: IGNORED_FIELDS,
});

// No public user queries — all user access is via the Me module
// Keep TC exported for potential future relations

export const dataLoaderSchema = schemaComposer.buildSchema();
export { UsersTC };
