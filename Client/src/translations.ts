import { ApolloLink } from '@apollo/client';
import { firstValueFrom, map } from 'rxjs';

import { Kicl_TranslationsDocument, type Kicl_TranslationsQuery } from 'api/generated/graphql';
import { acceptLanguage as header } from 'api/acceptLanguage';
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

const contentLanguageLink = new ApolloLink((operation, forward) => {
  return forward(operation).pipe(
    map((result) => {
      const { response } = operation.getContext() as { response?: Response };

      return { ...result, extensions: { ...result.extensions, contentLanguage: response?.headers.get('Content-Language') ?? '' } };
    }),
  );
});

/**
 * Each namespace that exists, as i18next resources, and the `Content-Language`
 * the API answered with: the languages the strings came from, which differ
 * from `acceptLanguage` when it isn't fully translated. Works before a session
 * starts.
 *
 * The answer skips Apollo's cache: i18next keeps the resources itself, and
 * `resetStore()` on sign-out would otherwise fetch every namespace again.
 */
export async function loadTranslations(acceptLanguage: string, namespaces: string[]) {
  const client = getKiclClient();

  const { data, extensions } = await firstValueFrom(
    ApolloLink.execute(
      contentLanguageLink.concat(client.link),
      {
        query: Kicl_TranslationsDocument,
        variables: { namespaces },
        context: { headers: { 'Accept-Language': header(acceptLanguage) } },
      },
      { client },
    ),
  );

  const resources = new Map<string, Resources>();

  for (const { field, namespace, value } of (data as Kicl_TranslationsQuery | null | undefined)?.Translations ?? []) {
    const branch = resources.get(namespace) ?? {};

    place(branch, field, value);
    resources.set(namespace, branch);
  }

  return {
    contentLanguage: String(extensions?.contentLanguage ?? ''),
    translations: [...resources].map(([namespace, branch]) => {
      return { namespace, resources: branch };
    }),
  };
}
