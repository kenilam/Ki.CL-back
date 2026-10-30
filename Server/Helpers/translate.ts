import { storedTranslation } from 'server/DataSources/MongoDB/Translations/cache.js';
import { SOURCE } from 'server/DataSources/MongoDB/Locales/Model.js';
import { currentAcceptLanguages } from 'server/Helpers/acceptLanguage.js';
import api from 'server/locales/en-US/api.json' with { type: 'json' };
import email from 'server/locales/en-US/email.json' with { type: 'json' };

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

function read(acceptLanguage: string, namespace: string, field: string): string | undefined {
  const stored = storedTranslation(acceptLanguage, namespace, field);

  if (stored !== undefined || acceptLanguage !== SOURCE) {
    return stored;
  }

  return bundled.get(namespace)?.get(field);
}

/** The fields to try, in i18next's order: `key_context_one`, `key_context`, `key_one`, `key`. */
function candidates(key: string, { context, count }: Values, acceptLanguage: string): string[] {
  const forms = count === undefined ? [] : [...(count === 0 ? ['zero'] : []), new Intl.PluralRules(acceptLanguage).select(count)];
  const bases = context ? [`${key}_${context}`, key] : [key];

  return bases.flatMap((base) => {
    return [...forms.map((form) => {
      return `${base}_${form}`;
    }), base];
  });
}

function find(namespace: string, key: string, values: Values): string | undefined {
  for (const acceptLanguage of currentAcceptLanguages()) {
    for (const field of candidates(key, values, acceptLanguage)) {
      const template = read(acceptLanguage, namespace, field);

      if (template !== undefined) {
        return template;
      }
    }
  }

  return undefined;
}

function resolve(namespace: string, key: string, values: Values, depth: number): string {
  const template = find(namespace, key, values);

  // Unknown keys answer with the key, as i18next does.
  if (template === undefined) {
    return key;
  }

  // References first, values last, so `$t(…)` or `{{…}}` inside a value is left as it was typed.
  return template
    .replace(NESTED, (match, other: string) =>
      depth < MAX_DEPTH ? resolve(namespace, other, values, depth + 1) : match,
    )
    .replace(VALUE, (match, name: string) => {
      const value = values[name];

      return value === undefined ? match : String(value);
    });
}

export function translate<N extends Namespace>(namespace: N, key: Key<N>, values: Values = {}): string {
  return resolve(namespace, key, values, 0);
}
