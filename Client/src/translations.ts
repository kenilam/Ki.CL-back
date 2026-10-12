import { Kicl_TranslationsDocument } from 'api/generated/graphql';
import { getKiclClient } from 'api/provider';

type Resources = { [key: string]: string | Resources | Resources[] | string[] };

const INDEX = /^\d+$/;

/**
 * Puts `account.signOut` at `resources.account.signOut`, the shape i18next
 * reads. A numbered step, `lines.0`, makes a list.
 */
function place(resources: Resources, field: string, value: string): void {
  const path = field.split('.');
  // Lists and branches are both indexed by the next step of the path.
  let branch = resources as Record<string, unknown>;

  path.slice(0, -1).forEach((key, index) => {
    branch[key] ??= INDEX.test(path[index + 1]) ? [] : {};
    branch = branch[key] as Record<string, unknown>;
  });

  branch[path[path.length - 1]] = value;
}

/**
 * Each namespace that exists in this language, as i18next resources. Works
 * before a session starts.
 *
 * The answer skips Apollo's cache: i18next keeps the resources itself, and
 * `resetStore()` on sign-out would otherwise fetch every namespace again.
 */
export async function loadTranslations(language: string, namespaces: string[]) {
  const { data } = await getKiclClient().query({
    fetchPolicy: 'no-cache',
    query: Kicl_TranslationsDocument,
    variables: { language, namespaces },
  });

  const translations = new Map<string, Resources>();

  for (const { field, namespace, value } of data?.Translations ?? []) {
    const resources = translations.get(namespace) ?? {};

    place(resources, field, value);
    translations.set(namespace, resources);
  }

  return [...translations].map(([namespace, resources]) => ({ namespace, resources }));
}
