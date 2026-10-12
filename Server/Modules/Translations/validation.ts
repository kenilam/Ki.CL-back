import * as v from 'valibot';
import { message } from 'server/Helpers/Validation/message.js';

const MAX_NAMESPACES = 16;

/** `en`, `zh-Hant`, `pt-BR`. */
const LANGUAGE = /^[a-z]{2,3}(-[A-Za-z0-9]{2,8}){0,2}$/;
/** `common`, `tree-of-life`. */
const NAMESPACE = /^[a-z0-9]+(-[a-z0-9]+)*$/;

export const TranslationsSchema = v.object({
  language: v.pipe(v.string(), v.regex(LANGUAGE, message('validation_language'))),
  namespaces: v.pipe(
    v.array(v.pipe(v.string(), v.maxLength(64), v.regex(NAMESPACE, message('validation_namespace')))),
    v.minLength(1, message('validation_namespaces_required')),
    v.maxLength(MAX_NAMESPACES, message('validation_namespaces_max', { count: MAX_NAMESPACES })),
  ),
});
