import { createHash } from 'node:crypto';
import { Translations, type ITranslation } from 'server/DataSources/MongoDB/Translations/Model.js';

type Resources = { [key: string]: unknown };
type Row = Pick<ITranslation, 'field' | 'language' | 'namespace' | 'value'>;
type Translation = { hash: string; language: string; namespace: string; resources: Resources };
type Store = Map<string, Translation>;

const TTL_MS = 60_000;
/** Development reads the database every time, so a seed shows on the next reload. */
const CACHED = process.env.NODE_ENV !== 'development';

let store: Store | null = null;
let loadedAt = 0;
let loading: Promise<Store> | null = null;

const keyOf = (language: string, namespace: string): string => `${language}:${namespace}`;

const isBranch = (value: unknown): value is Resources =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

/** Puts `account.signOut` at `resources.account.signOut`, the shape i18next reads. */
function place(resources: Resources, field: string, value: unknown): void {
  const path = field.split('.');
  const last = path.pop() as string;
  let branch = resources;

  for (const key of path) {
    const next = branch[key];
    branch = isBranch(next) ? next : (branch[key] = {});
  }

  branch[last] = value;
}

/** Rows arrive sorted by field, so the same strings always hash the same. */
function fold(rows: Row[]): Store {
  const folded: Store = new Map();

  for (const { field, language, namespace, value } of rows) {
    const key = keyOf(language, namespace);
    const translation = folded.get(key) ?? { hash: '', language, namespace, resources: {} };

    place(translation.resources, field, value);
    folded.set(key, translation);
  }

  for (const translation of folded.values()) {
    translation.hash = createHash('sha256').update(JSON.stringify(translation.resources)).digest('hex');
  }

  return folded;
}

function load(): Promise<Store> {
  loading ??= Translations.find({}, 'field language namespace value')
    .sort({ language: 1, namespace: 1, field: 1 })
    .read('nearest')
    .lean()
    .then((rows) => {
      store = fold(rows);
      loadedAt = Date.now();
      return store;
    })
    .finally(() => {
      loading = null;
    });

  return loading;
}

/**
 * The namespaces that exist, from memory. The query runs without a session, so
 * it must not cost a database read per request.
 *
 * A copy older than a minute is still returned while a fresh one loads, so a
 * seed shows within about a minute on each instance.
 */
export async function findTranslations(language: string, namespaces: string[]): Promise<Translation[]> {
  if (!CACHED || !store) {
    store = await load();
  } else if (Date.now() - loadedAt > TTL_MS) {
    load().catch((error: unknown) => console.error('❌ Translations did not reload:', error));
  }

  const current = store;
  return namespaces.flatMap((namespace) => current.get(keyOf(language, namespace)) ?? []);
}
