import { translate, type Key, type Values } from 'server/Helpers/translate.js';

/**
 * A valibot message that is read when the check fails, not when the schema is
 * built. Schemas are built once, as their module loads, and the text can
 * change in the database after that.
 */
export const message = (key: Key<'api'>, values?: Values) => (): string => translate('api', key, values);
