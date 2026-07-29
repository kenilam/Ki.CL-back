import type { CodegenConfig } from '@graphql-codegen/cli';

const SCALAR_MAP_SERVER = {
  DateTime: '^/Codegen/scalars.js#DateTime',
  EmailAddress: '^/Codegen/scalars.js#EmailAddress',
  JWT: '^/Codegen/scalars.js#JWT',
  UUID: '^/Codegen/scalars.js#UUID',
  URL: '^/Codegen/scalars.js#URL',
  NonEmptyString: '^/Codegen/scalars.js#NonEmptyString',
};

const SCALAR_MAP_CLIENT = {
  DateTime: '../scalars#DateTimeString',
  EmailAddress: '../scalars#EmailAddress',
  JWT: '../scalars#JWT',
  UUID: '../scalars#UUID',
  URL: '../scalars#URL',
  NonEmptyString: '../scalars#NonEmptyString',
};

const config: CodegenConfig = {
  schema: '../Server/Modules/**/*.graphql',
  generates: {
    // Server-side resolver types
    '../Server/Types/graphql.ts': {
      plugins: [
        'typescript',
        'typescript-resolvers',
      ],
      config: {
        useIndexSignature: true,
        contextType: 'server/Context/index.js#Context',
        scalars: SCALAR_MAP_SERVER,
      },
    },
    // Auto-generated operations (all fields), typed documents and client types
    '../Client/src/generated/': {
      preset: 'client',
      plugins: [],
      presetConfig: {
        gqlTagName: 'gql',
      },
      config: {
        scalars: SCALAR_MAP_CLIENT,
        dedupeFragments: true,
      },
      documents: '../Client/src/operations.graphql',
    },
  },
};

export default config;
