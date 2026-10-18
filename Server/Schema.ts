import { makeExecutableSchema } from '@graphql-tools/schema';
import { loadFilesSync } from '@graphql-tools/load-files';
import { mergeTypeDefs, mergeResolvers } from '@graphql-tools/merge';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const typeDefs = loadFilesSync(path.join(__dirname, 'Modules/**/*.graphql'));
const resolverFiles = loadFilesSync(path.join(__dirname, 'Modules/**/resolver.{ts,js}'));

const mergedTypeDefs = mergeTypeDefs(typeDefs);
const mergedResolvers = mergeResolvers(resolverFiles);

export const schema = makeExecutableSchema({
  typeDefs: mergedTypeDefs,
  resolvers: mergedResolvers,
});
