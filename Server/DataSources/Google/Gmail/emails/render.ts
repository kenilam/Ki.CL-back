import { join } from 'node:path';
import pug from 'pug';
import { LANGUAGE, translate, type Key, type Values } from 'server/Helpers/translate.js';

const compiled = new Map<string, pug.compileTemplate>();

/** A string of the `email` namespace. The templates call it as `t`. */
export const t = (key: Key<'email'>, values?: Values): string => translate('email', key, values);

/**
 * Renders `<name>.pug` from this folder. A template is compiled once, on first
 * use. Every template gets `t` for its text and `language` for the layout.
 */
export function render(name: string, locals: Record<string, unknown>): string {
  let template = compiled.get(name);

  if (!template) {
    template = pug.compileFile(join(import.meta.dirname, `${name}.pug`));
    compiled.set(name, template);
  }

  return template({ ...locals, language: LANGUAGE, t });
}
