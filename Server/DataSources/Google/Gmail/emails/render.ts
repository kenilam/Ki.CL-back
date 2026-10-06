import { join } from 'node:path';
import pug from 'pug';

const compiled = new Map<string, pug.compileTemplate>();

/** Renders `<name>.pug` from this folder. A template is compiled once, on first use. */
export function render(name: string, locals: Record<string, unknown>): string {
  let template = compiled.get(name);

  if (!template) {
    template = pug.compileFile(join(import.meta.dirname, `${name}.pug`));
    compiled.set(name, template);
  }

  return template(locals);
}
