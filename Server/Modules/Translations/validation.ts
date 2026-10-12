import * as v from 'valibot';

const MAX_NAMESPACES = 16;

/** `en`, `zh-Hant`, `pt-BR`. */
const LANGUAGE = /^[a-z]{2,3}(-[A-Za-z0-9]{2,8}){0,2}$/;
/** `common`, `tree-of-life`. */
const NAMESPACE = /^[a-z0-9]+(-[a-z0-9]+)*$/;

export const TranslationsSchema = v.object({
  language: v.pipe(v.string(), v.regex(LANGUAGE, 'Unknown language')),
  namespaces: v.pipe(
    v.array(v.pipe(v.string(), v.maxLength(64), v.regex(NAMESPACE, 'Unknown namespace'))),
    v.minLength(1, 'Name at least one namespace'),
    v.maxLength(MAX_NAMESPACES, `Ask for at most ${MAX_NAMESPACES} namespaces`),
  ),
});
