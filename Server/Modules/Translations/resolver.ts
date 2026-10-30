import type { Context } from 'server/Context/index.js';
import { validate } from 'server/Helpers/Validation/validate.js';
import { currentAcceptLanguages } from 'server/Helpers/acceptLanguage.js';
import {
  findAcceptLanguageStatuses,
  findTranslations,
  type AcceptLanguageStatus,
} from 'server/DataSources/MongoDB/Translations/cache.js';
import { TranslationsSchema } from './validation.js';

const POLL_MS = 15_000;

type Update = { AcceptLanguagesUpdated: AcceptLanguageStatus[] };

// An iterator rather than a generator: graphql-ws calls return() when the client leaves, which a generator waiting on a timer would only see at its next yield.
function acceptLanguageUpdates(): AsyncIterableIterator<Update> {
  let last = '';
  let stopped = false;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let wake: (() => void) | undefined;

  const iterator: AsyncIterableIterator<Update> = {
    async next() {
      while (!stopped) {
        const statuses = await findAcceptLanguageStatuses();
        const snapshot = JSON.stringify(statuses);

        if (snapshot !== last) {
          last = snapshot;
          return { done: false, value: { AcceptLanguagesUpdated: statuses } };
        }

        await new Promise<void>((resolve) => {
          wake = resolve;
          timer = setTimeout(resolve, POLL_MS);
        });
      }

      return { done: true, value: undefined };
    },
    async return() {
      stopped = true;
      clearTimeout(timer);
      wake?.();
      return { done: true, value: undefined };
    },
    [Symbol.asyncIterator]() {
      return iterator;
    },
  };

  return iterator;
}

export default {
  Query: {
    Translations: async (_: unknown, args: unknown, { res }: Context) => {
      const { namespaces } = validate(TranslationsSchema, args);
      const { translations, contentLanguages } = await findTranslations(currentAcceptLanguages(), namespaces);

      if (contentLanguages.length) {
        res?.setHeader('Content-Language', contentLanguages.join(', '));
      }

      return translations;
    },
  },
  Subscription: {
    AcceptLanguagesUpdated: {
      subscribe: () => {
        return acceptLanguageUpdates();
      },
    },
  },
};
