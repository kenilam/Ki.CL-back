/**
 * Copies the site's writing from JSON files into `translations`, one row for
 * each string.
 * This repo's are in `Server/locales`: the messages the API answers with and
 * the emails it sends.
 *
 * Run (MONGODB_DATABASE picks test or production, as for the server):
 *   npx tsx Server/Scripts/translations.ts seed ../Ki.CL/App/locales
 *   npx tsx Server/Scripts/translations.ts seed Server/locales
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
import { AcceptLanguage } from 'server/DataSources/MongoDB/Translations/acceptLanguage.js';
import { Translations } from 'server/DataSources/MongoDB/Translations/Model.js';
import { TranslationRuns } from 'server/DataSources/MongoDB/TranslationRuns/Model.js';
import { translateWithModel } from './translateWithModel.js';

const USAGE = 'Usage: translations.ts seed|diff|prune <dir> | drop <namespace> | translate [accept-language...] | migrate [--finish]';

const TRANSLATED = Object.values(AcceptLanguage).filter((acceptLanguage) => {
  return acceptLanguage !== AcceptLanguage.EnUs;
});

const PLURAL = /^(.+)_(zero|one|two|few|many|other)$/;

/** `.` joins a field's path, `:` is i18next's namespace separator, and Mongo reads `$` as an operator. */
const RESERVED = /[.:$]/;

type Branch = { [key: string]: unknown };
type File = { namespace: string; fields: Map<string, string> };
type Wanted = Map<string, { english: string; source: string }>;

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
  const folders = readdirSync(root, { withFileTypes: true }).filter((entry) => {
    return entry.isDirectory();
  });

  const other = folders.find(({ name }) => {
    return name !== AcceptLanguage.EnUs;
  });

  if (other) {
    throw new Error(`${join(root, other.name)}: only ${AcceptLanguage.EnUs} is kept in files. The other languages are translated into the database.`);
  }

  const files = folders.flatMap(({ name: folder }) => {
    return readdirSync(join(root, folder))
      .filter((name) => {
        return name.endsWith('.json');
      })
      .map((name) => {
        const path = join(root, folder, name);
        const contents: unknown = JSON.parse(readFileSync(path, 'utf8'));

        if (!isBranch(contents) || Array.isArray(contents)) {
          throw new Error(`${path}: expected an object of keys.`);
        }

        return { namespace: basename(name, '.json'), fields: flatten(contents, path) };
      });
  });

  if (!files.length) {
    throw new Error(`No ${AcceptLanguage.EnUs}/<namespace>.json files in ${root}.`);
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

/**
 * The fields a language needs for these English strings, each with the English
 * to translate and the `source` that marks it current. A plural string gets the
 * language's own plural forms, and their `source` is all the English forms, so
 * a change to any of them marks every form stale.
 */
function wanted(english: Map<string, string>, acceptLanguage: string): Wanted {
  const categories = new Intl.PluralRules(acceptLanguage).resolvedOptions().pluralCategories;
  const fields: Wanted = new Map();

  for (const [field, value] of english) {
    const base = PLURAL.exec(field)?.[1];

    if (base === undefined || !english.has(`${base}_other`)) {
      fields.set(field, { english: value, source: value });
      continue;
    }

    if (fields.has(`${base}_other`)) {
      continue;
    }

    const forms = [...english].filter(([other]) => {
      return PLURAL.exec(other)?.[1] === base;
    });

    const source = JSON.stringify(Object.fromEntries(forms));
    const other = english.get(`${base}_other`) ?? '';

    for (const category of new Set([...categories, ...(english.has(`${base}_zero`) ? ['zero'] : [])])) {
      fields.set(`${base}_${category}`, { english: english.get(`${base}_${category}`) ?? other, source });
    }
  }

  return fields;
}

async function translated(namespace: string) {
  return Translations.find(
    { 'accept-language': { $ne: AcceptLanguage.EnUs }, namespace },
    'accept-language field source',
  ).lean();
}

async function translate(acceptLanguages: AcceptLanguage[]): Promise<void> {
  const rows = await Translations.find({ 'accept-language': AcceptLanguage.EnUs }, 'namespace field value').lean();
  const namespaces = new Map<string, Map<string, string>>();

  for (const { namespace, field, value } of rows) {
    const english = namespaces.get(namespace) ?? new Map<string, string>();

    english.set(field, value);
    namespaces.set(namespace, english);
  }

  let failures = 0;
  let limited = false;

  for (const acceptLanguage of acceptLanguages) {
    try {
      const result = await translateLanguage(acceptLanguage, namespaces);

      failures += result.failures;
      limited = result.limited;
    } finally {
      await TranslationRuns.deleteOne({ 'accept-language': acceptLanguage });
    }

    if (limited) {
      break;
    }
  }

  // Not a failure: on a free tier the quota is expected to run out, and the next run carries on.
  if (limited) {
    console.log('Stopped at the model quota. The next run carries on from here.');
    return;
  }

  if (failures) {
    throw new Error(`${failures} string(s) were not translated. Run translate again to retry them.`);
  }
}

// Touched before each namespace, so the site's spinner stops for a run that died.
async function markRun(acceptLanguage: AcceptLanguage): Promise<void> {
  await TranslationRuns.updateOne({ 'accept-language': acceptLanguage }, { $set: { 'accept-language': acceptLanguage } }, { upsert: true });
}

async function translateLanguage(
  acceptLanguage: AcceptLanguage,
  namespaces: Map<string, Map<string, string>>,
): Promise<{ failures: number; limited: boolean }> {
  let failures = 0;

  for (const [namespace, english] of namespaces) {
    const name = `${acceptLanguage}/${namespace}`;
    const stored = await Translations.find({ 'accept-language': acceptLanguage, namespace }, 'field source').lean();
    const sources = new Map(stored.map((row) => {
      return [row.field, row.source];
    }));

    const fields = wanted(english, acceptLanguage);
    const stale = new Map(
      [...fields]
        .filter(([field, { source }]) => {
          return sources.get(field) !== source;
        })
        .map(([field, { english: text }]) => {
          return [field, text];
        }),
    );

    if (!stale.size) {
      console.log(`${name}: up to date`);
      continue;
    }

    await markRun(acceptLanguage);

    const { translated: written, failed, limited } = await translateWithModel(acceptLanguage, namespace, stale);

    if (written.size) {
      await Translations.bulkWrite(
        [...written].map(([field, value]) => {
          return {
            updateOne: {
              filter: { 'accept-language': acceptLanguage, namespace, field },
              update: { $set: { value, source: fields.get(field)?.source } },
              upsert: true,
            },
          };
        }),
      );
    }

    failures += failed.length;

    const report = `${name}: ${written.size} translated, ${failed.length} failed, ${fields.size - stale.size} up to date`;

    console.log(failed.length ? `${report}\n  ${failed.join('\n  ')}` : report);

    if (limited) {
      return { failures, limited };
    }
  }

  return { failures, limited: false };
}

/**
 * `language` becomes `accept-language`, and `en` becomes `en-US`. The first run
 * copies the field and swaps the unique index, and leaves `language` for the
 * old code still running; `--finish`, a release later, removes it.
 */
async function migrate(finish: boolean): Promise<void> {
  if (finish) {
    const { modifiedCount } = await Translations.collection.updateMany(
      { language: { $exists: true } },
      { $unset: { language: '' } },
    );

    console.log(`Removed language from ${modifiedCount} string(s).`);
    return;
  }

  const { modifiedCount } = await Translations.collection.updateMany({ 'accept-language': { $exists: false } }, [
    { $set: { 'accept-language': { $cond: [{ $eq: ['$language', 'en'] }, AcceptLanguage.EnUs, '$language'] } } },
  ]);

  const dropped = await Translations.syncIndexes();

  console.log(`Copied language to accept-language on ${modifiedCount} string(s). Dropped index: ${dropped.join(', ') || 'none'}.`);
}

async function run(): Promise<void> {
  const [command = '', target, ...rest] = process.argv.slice(2);

  if (command === 'translate') {
    const tags = [target, ...rest];

    const unknown = tags.find((tag) => {
      return tag !== undefined && !TRANSLATED.some((acceptLanguage) => {
        return acceptLanguage === tag;
      });
    });

    if (unknown) {
      throw new Error(`${unknown} is not one of ${TRANSLATED.join(', ')}.`);
    }

    const asked = TRANSLATED.filter((acceptLanguage) => {
      return tags.includes(acceptLanguage);
    });

    await connectDatabase();
    await translate(asked.length ? asked : TRANSLATED);
    console.log(`Done (${mongoose.connection.name}).`);
    return;
  }

  if (command === 'migrate') {
    await connectDatabase();
    await migrate(target === '--finish');
    console.log(`Done (${mongoose.connection.name}).`);
    return;
  }

  if (!target || !['seed', 'diff', 'prune', 'drop'].includes(command)) {
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

  for (const { fields, namespace } of files) {
    const name = `${AcceptLanguage.EnUs}/${namespace}`;
    const rows = await Translations.find({ 'accept-language': AcceptLanguage.EnUs, namespace }, 'field value').lean();
    const stored = new Map(rows.map((row) => {
      return [row.field, row.value];
    }));

    const changed = [...fields].filter(([field, value]) => {
      return value !== stored.get(field);
    });

    if (command === 'diff') {
      behind += changed.length;
      console.log(
        changed.length
          ? `${name}: ${changed.length} behind\n  ${changed.map(([field]) => field).join('\n  ')}`
          : `${name}: up to date`,
      );

      const others = await translated(namespace);
      const untranslated = TRANSLATED.flatMap((acceptLanguage) => {
        const sources = new Map(
          others
            .filter((row) => {
              return row['accept-language'] === acceptLanguage;
            })
            .map((row) => {
              return [row.field, row.source];
            }),
        );

        const count = [...wanted(fields, acceptLanguage)].filter(([field, { source }]) => {
          return sources.get(field) !== source;
        }).length;

        return count ? [`${acceptLanguage} ${count}`] : [];
      });

      console.log(untranslated.length ? `  not translated: ${untranslated.join(', ')}` : '  translated');
      continue;
    }

    const removed = [...stored.keys()].filter((field) => {
      return !fields.has(field) && (command === 'prune' || collides(field, fields));
    });

    if (changed.length || removed.length) {
      await Translations.bulkWrite([
        ...changed.map(([field, value]) => {
          return {
            updateOne: {
              filter: { 'accept-language': AcceptLanguage.EnUs, namespace, field },
              update: { $set: { value } },
              upsert: true,
            },
          };
        }),
        ...removed.map((field) => {
          return { deleteOne: { filter: { 'accept-language': AcceptLanguage.EnUs, namespace, field } } };
        }),
      ]);
    }

    let orphans = 0;

    if (command === 'prune') {
      const obsolete = (await translated(namespace)).filter((row) => {
        return !wanted(fields, row['accept-language']).has(row.field);
      });

      orphans = obsolete.length;

      if (orphans) {
        await Translations.deleteMany({
          _id: {
            $in: obsolete.map((row) => {
              return row._id;
            }),
          },
        });
      }
    }

    console.log(`${name}: ${changed.length} written, ${removed.length + orphans} removed, ${fields.size - changed.length} unchanged`);
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
