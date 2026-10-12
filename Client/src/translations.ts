import { Kicl_TranslationsDocument } from 'api/generated/graphql';
import { getKiclClient } from 'api/provider';

/**
 * The namespaces that exist in this language. Works before a session starts.
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

  return data?.Translations ?? [];
}
