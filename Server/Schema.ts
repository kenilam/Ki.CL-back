import { makeExecutableSchema } from '@graphql-tools/schema';
import { loadFiles, loadFilesSync } from '@graphql-tools/load-files';
import { mergeTypeDefs, mergeResolvers } from '@graphql-tools/merge';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const typeDefs = loadFilesSync(path.join(__dirname, 'Modules/**/*.graphql'));
// import(), not loadFilesSync's require(): required resolvers get their own copy of every module they use, apart from the server's.
const resolverFiles = await loadFiles(path.join(__dirname, 'Modules/**/resolver.{ts,js}'), {
  requireMethod: (file: string) => {
    return import(pathToFileURL(file).href);
  },
});

const mergedTypeDefs = mergeTypeDefs(typeDefs);
const mergedResolvers = mergeResolvers(resolverFiles);

export const schema = makeExecutableSchema({
  typeDefs: mergedTypeDefs,
  resolvers: mergedResolvers,
});
