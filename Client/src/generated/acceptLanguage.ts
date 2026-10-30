// Copied from Server/DataSources/MongoDB/Translations/acceptLanguage.ts by Codegen/generateAcceptLanguage.ts.
export enum AcceptLanguage {
  EnUs = 'en-US',
  EnGb = 'en-GB',
  ZhHans = 'zh-Hans',
  ZhHant = 'zh-Hant',
  Es = 'es',
  EsMx = 'es-MX',
  Ar = 'ar',
  PtBr = 'pt-BR',
  PtPt = 'pt-PT',
  Fr = 'fr',
  FrCa = 'fr-CA',
  De = 'de',
  DeCh = 'de-CH',
  Ja = 'ja',
  Ko = 'ko',
  Ru = 'ru',
  Hi = 'hi',
  Id = 'id',
  Tr = 'tr',
  It = 'it',
  Vi = 'vi',
}

export function matchAcceptLanguage(
  tag: string,
  languages: AcceptLanguage[] = Object.values(AcceptLanguage),
): AcceptLanguage | undefined {
  let asked: Intl.Locale;

  try {
    asked = new Intl.Locale(tag).maximize();
  } catch {
    return undefined;
  }

  const sameRegion = languages.find((language) => {
    const locale = new Intl.Locale(language).maximize();

    return locale.language === asked.language && locale.script === asked.script && locale.region === asked.region;
  });

  if (sameRegion) {
    return sameRegion;
  }

  return languages.find((language) => {
    const locale = new Intl.Locale(language).maximize();

    return locale.language === asked.language && locale.script === asked.script;
  });
}
