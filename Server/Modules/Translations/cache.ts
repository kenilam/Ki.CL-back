import { Translations, type ITranslation } from 'server/DataSources/MongoDB/Translations/Model.js';

type Translation = Pick<ITranslation, 'field' | 'language' | 'namespace' | 'value'>;
type Store = Map<string, Translation[]>;

const TTL_MS = 60_000;
/** Development reads the database every time, so a seed shows on the next reload. */
const CACHED = process.env.NODE_ENV !== 'development';

let store: Store | null = null;
let loadedAt = 0;
let loading: Promise<Store> | null = null;

const keyOf = (language: string, namespace: string): string => `${language}:${namespace}`;

function load(): Promise<Store> {
  loading ??= Translations.find({}, 'field language namespace value')
    .sort({ language: 1, namespace: 1, field: 1 })
    .read('nearest')
    .lean()
    .then((rows) => {
      const grouped: Store = new Map();

      for (const row of rows) {
        const key = keyOf(row.language, row.namespace);

        grouped.set(key, [...(grouped.get(key) ?? []), row]);
      }

      store = grouped;
      loadedAt = Date.now();
      return grouped;
    })
    .finally(() => {
      loading = null;
    });

  return loading;
}

/**
 * The strings of the namespaces that exist, from memory. The query runs
 * without a session, so it must not cost a database read per request.
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
