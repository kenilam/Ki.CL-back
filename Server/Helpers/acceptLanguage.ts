import { AsyncLocalStorage } from 'node:async_hooks';
import { AcceptLanguage, matchAcceptLanguage } from 'server/DataSources/MongoDB/Translations/acceptLanguage.js';
import { availableAcceptLanguages } from 'server/DataSources/MongoDB/Translations/cache.js';

const storage = new AsyncLocalStorage<AcceptLanguage[]>();

export function acceptLanguages(header: string | undefined): AcceptLanguage[] {
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
  const available = Object.values(AcceptLanguage).filter((language) => {
    return availableAcceptLanguages().has(language);
  });

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

  return [...new Set([...matched, AcceptLanguage.EnUs])];
}

export function currentAcceptLanguages(): AcceptLanguage[] {
  return storage.getStore() ?? [AcceptLanguage.EnUs];
}

export function withAcceptLanguages<T>(languages: AcceptLanguage[], run: () => T): T {
  return storage.run(languages, run);
}
