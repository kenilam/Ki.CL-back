import mongoose from 'mongoose';
import { Translations, type ITranslation } from './Model.js';

export type Translation = Pick<ITranslation, 'field' | 'language' | 'namespace' | 'value'>;

/** One namespace in one language: its rows as the query returns them, and the same strings by field. */
type Entry = { rows: Translation[]; values: Map<string, string> };
type Store = Map<string, Entry>;

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
        const entry = grouped.get(key) ?? { rows: [], values: new Map<string, string>() };

        entry.rows.push(row);
        entry.values.set(row.field, row.value);
        grouped.set(key, entry);
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

/** Starts a read without waiting for it. Before the database is connected there is nothing to read. */
function reload(): void {
  if (mongoose.connection.readyState !== mongoose.ConnectionStates.connected) {
    return;
  }

  load().catch((error: unknown) => console.error('❌ Translations did not reload:', error));
}

/**
 * Reads every string into memory. The server waits for this before it
 * listens, so its own messages come from the database from the first request.
 * A failed read is logged and boot carries on: `translate` falls back to the
 * JSON files in `Server/locales`.
 */
export async function loadTranslations(): Promise<void> {
  try {
    await load();
  } catch (error) {
    console.error('❌ Translations did not load:', error);
  }
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
    reload();
  }

  const current = store;
  return namespaces.flatMap((namespace) => current.get(keyOf(language, namespace))?.rows ?? []);
}

/**
 * One string from memory, or undefined when the database doesn't have it or
 * hasn't been read yet. It can't wait for a read, so an old copy is answered
 * from while a fresh one loads. Development starts that load on every call,
 * so a seed shows on the request after the next one.
 */
export function storedTranslation(language: string, namespace: string, field: string): string | undefined {
  if (!CACHED || !store || Date.now() - loadedAt > TTL_MS) {
    reload();
  }

  return store?.get(keyOf(language, namespace))?.values.get(field);
}
