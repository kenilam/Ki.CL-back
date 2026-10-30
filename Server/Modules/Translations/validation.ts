import * as v from 'valibot';
import { message } from 'server/Helpers/Validation/message.js';

const MAX_NAMESPACES = 16;

/** `common`, `tree-of-life`. */
const NAMESPACE = /^[a-z0-9]+(-[a-z0-9]+)*$/;

export const TranslationsSchema = v.object({
  namespaces: v.pipe(
    v.array(v.pipe(v.string(), v.maxLength(64), v.regex(NAMESPACE, message('validation_namespace')))),
    v.minLength(1, message('validation_namespaces_required')),
    v.maxLength(MAX_NAMESPACES, message('validation_namespaces_max', { count: MAX_NAMESPACES })),
  ),
});
