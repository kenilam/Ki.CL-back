/**
 * Copies the site's writing from JSON files into `translations`, one row for
 * each string. Each repo keeps its own namespaces at
 * `<dir>/<language>/<namespace>.json`.
 *
 * Run (MONGODB_DATABASE picks test or production, as for the server):
 *   npx tsx Server/Scripts/translations.ts seed ../Ki.CL/App/locales
 *   npx tsx Server/Scripts/translations.ts diff ../Ki.CL/App/locales
 *   npx tsx Server/Scripts/translations.ts prune ../Ki.CL/App/locales
 *   npx tsx Server/Scripts/translations.ts drop resume
 *
 * `seed` adds and changes strings and leaves the rest alone, so a page loaded
 * before a release still finds the keys it asks for. `prune` removes what the
 * files no longer have; run it a release later.
 */
import 'dotenv/config';
import { readdirSync, readFileSync } from 'node:fs';
import { basename, join, resolve } from 'node:path';
import { connectDatabase, mongoose } from 'server/DataSources/MongoDB/index.js';
import { Translations } from 'server/DataSources/MongoDB/Translations/Model.js';

const USAGE = 'Usage: translations.ts seed|diff|prune <dir> | drop <namespace>';

/** `.` joins a field's path, `:` is i18next's namespace separator, and Mongo reads `$` as an operator. */
const RESERVED = /[.:$]/;

type Branch = { [key: string]: unknown };
type File = { language: string; namespace: string; fields: Map<string, string> };

/** A list is a branch whose keys are its positions, so `lines[0]` is the field `lines.0`. */
const isBranch = (value: unknown): value is Branch => typeof value === 'object' && value !== null;

/** Every string in the file, by its dotted path. */
function flatten(branch: Branch, file: string, path: string[] = [], fields = new Map<string, string>()) {
  for (const [key, value] of Object.entries(branch)) {
    if (RESERVED.test(key)) {
      throw new Error(`${file}: the key "${key}" contains ".", ":" or "$".`);
    }

    const field = [...path, key].join('.');

    if (isBranch(value)) {
      flatten(value, file, [...path, key], fields);
    } else if (typeof value === 'string') {
      fields.set(field, value);
    } else {
      throw new Error(`${file}: ${field} is not a string.`);
    }
  }

  return fields;
}

function readFiles(directory: string): File[] {
  const root = resolve(directory);
  const languages = readdirSync(root, { withFileTypes: true }).filter((entry) => entry.isDirectory());

  const files = languages.flatMap(({ name: language }) =>
    readdirSync(join(root, language))
      .filter((name) => name.endsWith('.json'))
      .map((name) => {
        const path = join(root, language, name);
        const contents: unknown = JSON.parse(readFileSync(path, 'utf8'));

        if (!isBranch(contents) || Array.isArray(contents)) {
          throw new Error(`${path}: expected an object of keys.`);
        }

        return { language, namespace: basename(name, '.json'), fields: flatten(contents, path) };
      }),
  );

  if (!files.length) {
    throw new Error(`No <language>/<namespace>.json files in ${root}.`);
  }

  return files;
}

/**
 * A stored field that can't sit beside the file's: `account` where the file
 * now has `account.title`, or the other way round. One is a string where the
 * other needs a branch.
 */
const collides = (stored: string, fields: Map<string, string>): boolean =>
  [...fields.keys()].some((field) => field.startsWith(`${stored}.`) || stored.startsWith(`${field}.`));

async function run(): Promise<void> {
  const [command, target] = process.argv.slice(2);

  if (!target || !['seed', 'diff', 'prune', 'drop'].includes(command ?? '')) {
    throw new Error(USAGE);
  }

  // Read before connecting, so a bad file fails without touching the database.
  const files = command === 'drop' ? [] : readFiles(target);

  await connectDatabase();
  const database = mongoose.connection.name;

  if (command === 'drop') {
    const { deletedCount } = await Translations.deleteMany({ namespace: target });

    console.log(`Removed ${deletedCount} string(s) of ${target} (${database}).`);
    return;
  }

  let behind = 0;

  for (const { fields, language, namespace } of files) {
    const name = `${language}/${namespace}`;
    const rows = await Translations.find({ language, namespace }, 'field value').lean();
    const stored = new Map(rows.map((row) => [row.field, row.value]));

    const changed = [...fields].filter(([field, value]) => value !== stored.get(field));

    if (command === 'diff') {
      behind += changed.length;
      console.log(
        changed.length
          ? `${name}: ${changed.length} behind\n  ${changed.map(([field]) => field).join('\n  ')}`
          : `${name}: up to date`,
      );
      continue;
    }

    const removed = [...stored.keys()].filter(
      (field) => !fields.has(field) && (command === 'prune' || collides(field, fields)),
    );

    if (changed.length || removed.length) {
      await Translations.bulkWrite([
        ...changed.map(([field, value]) => ({
          updateOne: {
            filter: { language, namespace, field },
            update: { $set: { value } },
            upsert: true,
          },
        })),
        ...removed.map((field) => ({ deleteOne: { filter: { language, namespace, field } } })),
      ]);
    }

    console.log(`${name}: ${changed.length} written, ${removed.length} removed, ${fields.size - changed.length} unchanged`);
  }

  if (command === 'diff' && behind) {
    throw new Error(`${database} is ${behind} string(s) behind ${target}.`);
  }

  console.log(`Done (${database}).`);
}

run()
  .catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(() => mongoose.disconnect());
