import {
  DateTimeResolver,
  EmailAddressResolver,
  UUIDResolver,
  JWTResolver,
  URLResolver,
  NonEmptyStringResolver,
} from 'graphql-scalars';
import { GraphQLScalarType, Kind } from 'graphql';
import { AcceptLanguage } from 'server/DataSources/MongoDB/Translations/acceptLanguage.js';

function acceptLanguage(value: unknown): AcceptLanguage {
  const tag = Object.values(AcceptLanguage).find((language) => {
    return language === value;
  });

  if (!tag) {
    throw new TypeError(`${String(value)} is not an AcceptLanguage.`);
  }

  return tag;
}

const AcceptLanguageResolver = new GraphQLScalarType<AcceptLanguage, string>({
  name: 'AcceptLanguage',
  description: 'A language the site is written in, as an Accept-Language tag: `en-US`, `zh-Hant`.',
  serialize: acceptLanguage,
  parseValue: acceptLanguage,
  parseLiteral: (node) => {
    return acceptLanguage(node.kind === Kind.STRING ? node.value : undefined);
  },
});

export default {
  AcceptLanguage: AcceptLanguageResolver,
  DateTime: DateTimeResolver,
  EmailAddress: EmailAddressResolver,
  UUID: UUIDResolver,
  JWT: JWTResolver,
  URL: URLResolver,
  NonEmptyString: NonEmptyStringResolver,
};
