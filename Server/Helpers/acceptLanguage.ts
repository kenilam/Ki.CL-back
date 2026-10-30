import { AsyncLocalStorage } from 'node:async_hooks';
import { SOURCE } from 'server/DataSources/MongoDB/Locales/Model.js';
import { availableAcceptLanguages } from 'server/DataSources/MongoDB/Translations/cache.js';

const storage = new AsyncLocalStorage<string[]>();

export function matchAcceptLanguage(tag: string, languages: string[]): string | undefined {
  let asked: Intl.Locale;

  try {
    asked = new Intl.Locale(tag).maximize();
  } catch {
    return undefined;
  }

  const sameRegion = languages.find((language) => {
    const locale = new Intl.Locale(language).maximize();

    return locale.language === asked.language && locale.script === asked.script && locale.region === asked.region;
  });

  if (sameRegion) {
    return sameRegion;
  }

  return languages.find((language) => {
    const locale = new Intl.Locale(language).maximize();

    return locale.language === asked.language && locale.script === asked.script;
  });
}

export function acceptLanguages(header: string | undefined): string[] {
  const ranges = (header ?? '').split(',').map((range) => {
    const [tag = '', ...parameters] = range.split(';').map((part) => {
      return part.trim();
    });

    const quality = parameters.find((parameter) => {
      return parameter.startsWith('q=');
    });

    return { tag, q: quality ? Number(quality.slice(2)) : 1 };
  });

  // Matched among the available languages only, so `es-MX` falls back to `es` before the next range.
  const available = [...availableAcceptLanguages()];

  const matched = ranges
    .filter(({ tag, q }) => {
      return tag !== '' && tag !== '*' && q > 0;
    })
    .sort((a, b) => {
      return b.q - a.q;
    })
    .map(({ tag }) => {
      return matchAcceptLanguage(tag, available);
    })
    .filter((language) => {
      return language !== undefined;
    });

  return [...new Set([...matched, SOURCE])];
}

export function currentAcceptLanguages(): string[] {
  return storage.getStore() ?? [SOURCE];
}

export function withAcceptLanguages<T>(languages: string[], run: () => T): T {
  return storage.run(languages, run);
}
