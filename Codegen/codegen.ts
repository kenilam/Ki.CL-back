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
    // Auto-generated operations (all fields) + client types + hooks
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
    // React hooks
    '../Client/src/generated/hooks.ts': {
      plugins: [
        'typescript-operations',
        'typescript-react-apollo',
      ],
      documents: '../Client/src/operations.graphql',
      config: {
        withHooks: true,
        withComponent: false,
        withHOC: false,
        // Its overloads are written against Apollo Client 3 and do not
        // typecheck under 4; nothing consumes them. Opt-out added by patch.
        withSuspenseQuery: false,
        // Apollo Client 4 has no MutationFunction type; nothing uses the alias.
        withMutationFn: false,
        scalars: SCALAR_MAP_CLIENT,
        // Avoid duplicate type names between operations and hook results
        omitOperationSuffix: true,
        operationResultSuffix: 'Data',
        // Apollo Client 4 serves the React bindings from their own entry point;
        // the plugin still defaults to the v3 root export.
        reactApolloVersion: 3,
        apolloReactCommonImportFrom: '@apollo/client/react',
        apolloReactHooksImportFrom: '@apollo/client/react',
      },
    },
  },
};

export default config;
