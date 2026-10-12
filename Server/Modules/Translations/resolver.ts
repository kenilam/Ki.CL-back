import { validate } from 'server/Helpers/Validation/validate.js';
import { findTranslations } from 'server/DataSources/MongoDB/Translations/cache.js';
import { TranslationsSchema } from './validation.js';

export default {
  Query: {
    Translations: async (_: unknown, args: unknown) => {
      const { language, namespaces } = validate(TranslationsSchema, args);

      return findTranslations(language, namespaces);
    },
  },
};
