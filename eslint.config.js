import js from '@eslint/js';
import tsPlugin from '@typescript-eslint/eslint-plugin';
import tsParser from '@typescript-eslint/parser';
import globals from 'globals';

/*
 * Flat config, written as ESM because this package is `"type": "module"` —
 * unlike the Frontend's, which is CommonJS and uses `require`.
 *
 * The repo spans two runtimes: Server and Codegen are Node, while Client is the
 * federated React bundle the browser loads. They get separate blocks rather than
 * one permissive union, so a `window` reference in a resolver is still an error.
 */

const rules = {
  ...js.configs.recommended.rules,
  ...tsPlugin.configs.recommended.rules,
  /*
   * Augmenting Express's `Request` needs `declare global { namespace Express }`
   * — there is no ES module equivalent for merging into a global namespace, so
   * declarations are allowed while runtime namespaces stay banned.
   */
  '@typescript-eslint/no-namespace': ['error', { allowDeclarations: true }],
  /*
   * Matches the Frontend's, so a file moved between repos lints the same:
   * unused function arguments are allowed (they document a signature), and an
   * underscore prefix marks anything else deliberately unused.
   */
  '@typescript-eslint/no-unused-vars': [
    'error',
    {
      args: 'none',
      argsIgnorePattern: '^_',
      caughtErrors: 'none',
      destructuredArrayIgnorePattern: '^_',
      ignoreRestSiblings: true,
      varsIgnorePattern: '^_',
    },
  ],
};

export default [
  {
    // Codegen output, not hand-written source.
    ignores: [
      '**/node_modules/**',
      '**/dist/**',
      'Server/Types/**',
      'Client/src/generated/**',
      'Client/@mf-types/**',
    ],
  },
  {
    files: ['Server/**/*.ts', 'Codegen/**/*.ts', 'Scripts/**/*.ts'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: globals.node,
      parser: tsParser,
    },
    plugins: { '@typescript-eslint': tsPlugin },
    rules,
  },
  {
    files: ['Client/**/*.{ts,tsx}'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: { ...globals.browser, ...globals.node },
      parser: tsParser,
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
    plugins: { '@typescript-eslint': tsPlugin },
    rules,
  },
];
