/**
 * Auto-generate operations.graphql from schema files using @graphql-tools/utils.
 * Uses buildOperationNodeForField to generate full operations for each
 * query / mutation / subscription. Prefixes all operation names with kicl_
 *
 * Run: npx tsx Codegen/generateOperations.ts
 */
import { buildSchema, OperationTypeNode, print } from 'graphql';
import { buildOperationNodeForField } from '@graphql-tools/utils';
import { loadFilesSync } from '@graphql-tools/load-files';
import { mergeTypeDefs } from '@graphql-tools/merge';
import { writeFileSync } from 'node:fs';
import appRoot from 'app-root-path';

const PREFIX = 'kicl_';
const MAX_DEPTH = 2;
/** Nested children depth — matches server heightLimit max (3). */
const TREE_OF_LIFE_DEPTH = 3;
/**
 * Nested ancestor depth — lets the client resolve a fresh/deep-linked node's
 * lineage in one round trip (each level is DataLoader-batched server-side,
 * so this stays cheap). Fallback for lineages deeper than this is a client-
 * side repeat query rooted at the deepest-still-unknown ancestor.
 */
const TREE_OF_LIFE_ANCESTOR_DEPTH = 12;

const TREE_NODE_FIELDS = [
  'nodeId',
  'ottId',
  'name',
  'rank',
  'numTips',
  'assetId',
  'description',
  'visualStatus',
] as const;

/**
 * Each ancestor level needs its own basic fields, plus one shallow level of
 * its `descendants` (the child we came from, plus its siblings) — sibling
 * index/count among a parent's children is required client-side to compute
 * a stable position, and that only comes from the parent's own descendants
 * list, not from the child's `ancestor` field. Siblings are not recursed
 * further (no grandchildren-of-siblings) to keep this bounded.
 *
 * Only ever nested under the *root* selection of a subtree operation (see
 * `buildTreeOfLifeRootFields`) — descendant nodes reuse the cheap shallow
 * `ancestor` snippet in `buildTreeOfLifeNodeFields`, since their parent is
 * already implicit (it's whichever node's `descendants` they came from).
 * Nesting this per descendant too would duplicate the same chain hundreds
 * of times over in one response.
 */
function buildTreeOfLifeAncestorSelection(depth: number, indent: string): string {
  if (depth <= 0) {
    return '';
  }

  const fields = TREE_NODE_FIELDS.map((field) => `${indent}${field}`).join('\n');
  const siblingFields = TREE_NODE_FIELDS
    .map((field) => `${indent}  ${field}`)
    .join('\n');
  const nested = buildTreeOfLifeAncestorSelection(depth - 1, `${indent}  `);
  const ancestorBlock = nested
    ? `\n${indent}ancestor {\n${nested}\n${indent}}`
    : '';

  return `${fields}
${indent}descendants {
${siblingFields}
${indent}}${ancestorBlock}`;
}

/** Shallow single-level ancestor — used on every descendant node (cheap). */
function buildTreeOfLifeNodeFields(indent: string): string {
  const fieldLines = TREE_NODE_FIELDS.map((field) => `${indent}${field}`).join('\n');
  return `${fieldLines}
${indent}visualScore {
${indent}  overall
${indent}  taxonMatch
${indent}  pass
${indent}}
${indent}ancestor {
${indent}  nodeId
${indent}  ottId
${indent}  name
${indent}  rank
${indent}}
${indent}asset {
${indent}  id
${indent}  url
${indent}  generator
${indent}}`;
}

/** Full fields for the query's own root node — includes the deep ancestor chain. */
function buildTreeOfLifeRootFields(indent: string): string {
  const fieldLines = TREE_NODE_FIELDS.map((field) => `${indent}${field}`).join('\n');
  const ancestorChain = buildTreeOfLifeAncestorSelection(
    TREE_OF_LIFE_ANCESTOR_DEPTH,
    `${indent}  `,
  );

  return `${fieldLines}
${indent}visualScore {
${indent}  overall
${indent}  taxonMatch
${indent}  pass
${indent}}
${indent}ancestor {
${ancestorChain}
${indent}}
${indent}asset {
${indent}  id
${indent}  url
${indent}  generator
${indent}}`;
}

function buildTreeOfLifeDescendantsSelection(depth: number, indent: string): string {
  if (depth <= 0) {
    return '';
  }

  const fields = buildTreeOfLifeNodeFields(`${indent}  `);
  const nested = buildTreeOfLifeDescendantsSelection(depth - 1, `${indent}  `);
  const descendantsBlock = nested
    ? `\n${indent}  descendants {\n${nested}\n${indent}  }`
    : '';

  return `${fields}${descendantsBlock}`;
}

function buildTreeOfLifeSubtreeOperation(): string {
  const rootFields = buildTreeOfLifeRootFields('    ');
  const descendants = buildTreeOfLifeDescendantsSelection(TREE_OF_LIFE_DEPTH, '    ');

  return `query ${PREFIX}TreeOfLifeSubtree($ottId: Int, $nodeId: String, $heightLimit: Int = 3) {
  TreeOfLifeSubtree(ottId: $ottId, nodeId: $nodeId, heightLimit: $heightLimit) {
${rootFields}
    descendants {
${descendants}
    }
  }
}`;
}

function buildTreeOfLifeSubtreesOperation(): string {
  const rootFields = buildTreeOfLifeRootFields('    ');
  const descendants = buildTreeOfLifeDescendantsSelection(TREE_OF_LIFE_DEPTH, '    ');

  return `query ${PREFIX}TreeOfLifeSubtrees($ottIds: [Int!], $nodeIds: [String!], $heightLimit: Int = 3) {
  TreeOfLifeSubtrees(ottIds: $ottIds, nodeIds: $nodeIds, heightLimit: $heightLimit) {
${rootFields}
    descendants {
${descendants}
    }
  }
}`;
}

const typeDefs = loadFilesSync(appRoot.resolve('Server/Modules/**/*.graphql'));
const merged = mergeTypeDefs(typeDefs);
const schemaStr = print(merged);
const schema = buildSchema(schemaStr);

const operations: string[] = [];

// Generate queries
const queryType = schema.getQueryType();
if (queryType) {
  for (const fieldName of Object.keys(queryType.getFields())) {
    if (fieldName.startsWith('_')) continue;

    // Recursive TreeOfLifeNode needs an explicit deep selection set.
    if (fieldName === 'TreeOfLifeSubtree') {
      operations.push(buildTreeOfLifeSubtreeOperation());
      continue;
    }
    if (fieldName === 'TreeOfLifeSubtrees') {
      operations.push(buildTreeOfLifeSubtreesOperation());
      continue;
    }

    const node = buildOperationNodeForField({
      schema,
      kind: OperationTypeNode.QUERY,
      field: fieldName,
      depthLimit: MAX_DEPTH,
    });

    // Replace the auto-generated operation name with our prefixed one
    const printed = print(node);
    const renamed = printed.replace(
      /^query\s+\w+/,
      `query ${PREFIX}${fieldName}`,
    );
    operations.push(renamed);
  }
}

// Generate mutations
const mutationType = schema.getMutationType();
if (mutationType) {
  for (const fieldName of Object.keys(mutationType.getFields())) {
    if (fieldName.startsWith('_')) continue;

    const node = buildOperationNodeForField({
      schema,
      kind: OperationTypeNode.MUTATION,
      field: fieldName,
      depthLimit: MAX_DEPTH,
    });

    const printed = print(node);
    const renamed = printed.replace(
      /^mutation\s+\w+/,
      `mutation ${PREFIX}${fieldName}`,
    );
    operations.push(renamed);
  }
}

// Generate subscriptions
const subscriptionType = schema.getSubscriptionType();
if (subscriptionType) {
  for (const fieldName of Object.keys(subscriptionType.getFields())) {
    if (fieldName.startsWith('_')) continue;

    const node = buildOperationNodeForField({
      schema,
      kind: OperationTypeNode.SUBSCRIPTION,
      field: fieldName,
      depthLimit: MAX_DEPTH,
    });

    const printed = print(node);
    const renamed = printed.replace(
      /^subscription\s+\w+/,
      `subscription ${PREFIX}${fieldName}`,
    );
    operations.push(renamed);
  }
}

const output = operations.join('\n\n') + '\n';
const outputPath = appRoot.resolve('Client/src/operations.graphql');
writeFileSync(outputPath, output);
console.log(`✅ Generated operations.graphql with ${PREFIX} prefix (${operations.length} operations)`);
console.log(`   → ${outputPath}`);
