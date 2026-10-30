import mongoose from 'mongoose';
import { Locales, SOURCE } from 'server/DataSources/MongoDB/Locales/Model.js';
import { TranslationRuns } from 'server/DataSources/MongoDB/TranslationRuns/Model.js';
import { Translations } from './Model.js';

export type Translation = { namespace: string; field: string; value: string };
export type AcceptLanguageStatus = {
  acceptLanguage: string;
  complete: boolean;
  translating: boolean;
};

type Entry = { rows: Translation[]; values: Map<string, string> };
type Store = Map<string, Entry>;

const TTL_MS = 60_000;
const CACHED = process.env.NODE_ENV !== 'development';

// A run the script hasn't touched for this long stopped without clearing itself.
const RUN_STALE_MS = 5 * 60_000;

const PLURAL = /_(zero|one|two|few|many|other)$/;

let store: Store | null = null;
let loadedAt = 0;
let loading: Promise<Store> | null = null;
let statuses: AcceptLanguageStatus[] = [];

function keyOf(acceptLanguage: string, namespace: string): string {
  return `${acceptLanguage}:${namespace}`;
}

function statusesOf(tags: string[], grouped: Store, namespaces: Set<string>, running: Set<string>): AcceptLanguageStatus[] {
  return tags.map((acceptLanguage) => {
    // Compared without plural endings: Chinese has only `_other` where English has `_one` and `_other`.
    const complete = [...namespaces].every((namespace) => {
      const translated = new Set(
        [...(grouped.get(keyOf(acceptLanguage, namespace))?.values.keys() ?? [])].map((field) => {
          return field.replace(PLURAL, '');
        }),
      );

      return [...(grouped.get(keyOf(SOURCE, namespace))?.values.keys() ?? [])].every((field) => {
        return translated.has(field.replace(PLURAL, ''));
      });
    });

    return { acceptLanguage, complete, translating: running.has(acceptLanguage) };
  });
}

function load(): Promise<Store> {
  loading ??= Promise.all([
    Translations.find({}, 'accept-language field namespace value')
      .sort({ 'accept-language': 1, namespace: 1, field: 1 })
      .read('nearest')
      .lean(),
    TranslationRuns.find({ updatedAt: { $gt: new Date(Date.now() - RUN_STALE_MS) } }, 'accept-language')
      .read('nearest')
      .lean(),
    Locales.find({}, 'tag').sort({ tag: 1 }).read('nearest').lean(),
  ])
    .then(([rows, runs, locales]) => {
      const grouped: Store = new Map();
      const namespaces = new Set<string>();

      for (const { 'accept-language': acceptLanguage, field, namespace, value } of rows) {
        const key = keyOf(acceptLanguage, namespace);
        const entry = grouped.get(key) ?? { rows: [], values: new Map<string, string>() };

        entry.rows.push({ namespace, field, value });
        entry.values.set(field, value);
        grouped.set(key, entry);

        if (acceptLanguage === SOURCE) {
          namespaces.add(namespace);
        }
      }

      const running = new Set(
        runs.map((run) => {
          return run['accept-language'];
        }),
      );

      statuses = statusesOf(
        locales.map((locale) => {
          return locale.tag;
        }),
        grouped,
        namespaces,
        running,
      );
      store = grouped;
      loadedAt = Date.now();
      return grouped;
    })
    .finally(() => {
      loading = null;
    });

  return loading;
}

function reload(): void {
  if (mongoose.connection.readyState !== mongoose.ConnectionStates.connected) {
    return;
  }

  load().catch((error: unknown) => {
    console.error('❌ Translations did not reload:', error);
  });
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
 * Each field of the namespaces, from the first of the languages that has it,
 * and the languages the fields came from, in the same order. The query runs
 * without a session, so it must not cost a database read per request. A copy
 * older than a minute is still returned while a fresh one loads, so a seed
 * shows within about a minute on each instance.
 */
export async function findTranslations(
  acceptLanguages: string[],
  namespaces: string[],
): Promise<{ translations: Translation[]; contentLanguages: string[] }> {
  if (!CACHED || !store) {
    store = await load();
  }

  if (Date.now() - loadedAt > TTL_MS) {
    reload();
  }

  const current = store;
  const used = new Set<string>();

  const translations = namespaces.flatMap((namespace) => {
    const fields = new Map<string, Translation>();

    for (const acceptLanguage of acceptLanguages) {
      for (const row of current.get(keyOf(acceptLanguage, namespace))?.rows ?? []) {
        if (!fields.has(row.field)) {
          fields.set(row.field, row);
          used.add(acceptLanguage);
        }
      }
    }

    return [...fields.values()];
  });

  const contentLanguages = acceptLanguages.filter((acceptLanguage) => {
    return used.has(acceptLanguage);
  });

  return { translations, contentLanguages };
}

/**
 * Whether each language is fully translated, and whether `make
 * translations.translate` is working on it, from the same copy in memory.
 */
export async function findAcceptLanguageStatuses(): Promise<AcceptLanguageStatus[]> {
  if (!CACHED || !store) {
    store = await load();
  }

  if (Date.now() - loadedAt > TTL_MS) {
    reload();
  }

  return statuses;
}

/** The languages a request may be answered in: each fully translated one, and always `en-US`. */
export function availableAcceptLanguages(): Set<string> {
  return new Set([
    SOURCE,
    ...statuses
      .filter(({ complete }) => {
        return complete;
      })
      .map(({ acceptLanguage }) => {
        return acceptLanguage;
      }),
  ]);
}

/**
 * One string from memory, or undefined when the database doesn't have it or
 * hasn't been read yet. It can't wait for a read, so an old copy is answered
 * from while a fresh one loads.
 */
export function storedTranslation(acceptLanguage: string, namespace: string, field: string): string | undefined {
  if (!CACHED || !store || Date.now() - loadedAt > TTL_MS) {
    reload();
  }

  return store?.get(keyOf(acceptLanguage, namespace))?.values.get(field);
}
