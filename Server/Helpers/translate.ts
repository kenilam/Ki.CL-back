import { storedTranslation } from 'server/DataSources/MongoDB/Translations/cache.js';
import api from 'server/locales/en/api.json' with { type: 'json' };
import email from 'server/locales/en/email.json' with { type: 'json' };

/** The one language the server writes in, until requests carry their own. */
export const LANGUAGE = 'en';

/** The English files in `Server/locales`, read when the database doesn't have a string. */
const BUNDLED = { api, email };

export type Namespace = keyof typeof BUNDLED;

/** `a_b_c` gives `a`, `a_b` and `a_b_c`, so a key can be named without its context or plural form. */
type Prefixes<Key extends string, Head extends string = ''> = Key extends `${infer Part}_${infer Rest}`
  ? `${Head}${Part}` | Prefixes<Rest, `${Head}${Part}_`>
  : `${Head}${Key}`;

export type Key<N extends Namespace> = Prefixes<keyof (typeof BUNDLED)[N] & string>;

export type Values = {
  /** Picks `key_<context>` when it exists. */
  context?: string;
  /** Picks `key_one` for 1 and `key_other` for the rest, or `key_zero` for 0 when it exists. */
  count?: number;
  [name: string]: string | number | undefined;
};

const NESTED = /\$t\(\s*([^)\s]+)\s*\)/g;
const VALUE = /\{\{\s*(\w+)\s*\}\}/g;

/** A string that refers to itself would otherwise never finish. */
const MAX_DEPTH = 5;

const bundled = new Map(
  Object.entries(BUNDLED).map(([namespace, strings]) => [namespace, new Map(Object.entries(strings))]),
);

const read = (language: string, namespace: string, field: string): string | undefined =>
  storedTranslation(language, namespace, field)
  ?? (language === LANGUAGE ? undefined : storedTranslation(LANGUAGE, namespace, field))
  ?? bundled.get(namespace)?.get(field);

/** The fields to try, in i18next's order: `key_context_one`, `key_context`, `key_one`, `key`. */
function candidates(key: string, { context, count }: Values): string[] {
  const forms = count === undefined ? [] : [...(count === 0 ? ['zero'] : []), count === 1 ? 'one' : 'other'];
  const bases = context ? [`${key}_${context}`, key] : [key];

  return bases.flatMap((base) => [...forms.map((form) => `${base}_${form}`), base]);
}

function resolve(namespace: string, key: string, values: Values, language: string, depth: number): string {
  let template: string | undefined;

  for (const field of candidates(key, values)) {
    template = read(language, namespace, field);

    if (template !== undefined) {
      break;
    }
  }

  // Unknown keys answer with the key, as i18next does.
  if (template === undefined) {
    return key;
  }

  // References first, values last, so `$t(…)` or `{{…}}` inside a value is left as it was typed.
  return template
    .replace(NESTED, (match, other: string) =>
      depth < MAX_DEPTH ? resolve(namespace, other, values, language, depth + 1) : match,
    )
    .replace(VALUE, (match, name: string) => {
      const value = values[name];

      return value === undefined ? match : String(value);
    });
}

/**
 * One of the server's own strings, for a message that is about to be shown to
 * a person. It reads the copy of the database that is kept in memory, and the
 * JSON file in `Server/locales` for a key the database doesn't have, so the
 * answer is never a bare key for a string this repo ships.
 *
 * It follows i18next for the parts the files use: `{{name}}` takes a value,
 * `context` and `count` pick a variant of the key, and `$t(other_key)` reads
 * another key of the same namespace. Values are not escaped.
 */
export function translate<N extends Namespace>(
  namespace: N,
  key: Key<N>,
  values: Values = {},
  language: string = LANGUAGE,
): string {
  return resolve(namespace, key, values, language, 0);
}
