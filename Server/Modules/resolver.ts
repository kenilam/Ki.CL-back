import {
  DateTimeResolver,
  EmailAddressResolver,
  UUIDResolver,
  JWTResolver,
  URLResolver,
  NonEmptyStringResolver,
} from 'graphql-scalars';
import { GraphQLScalarType, Kind } from 'graphql';
import { isCanonical } from 'server/DataSources/MongoDB/Locales/Model.js';

function acceptLanguage(value: unknown): string {
  if (typeof value !== 'string' || !isCanonical(value)) {
    throw new TypeError(`${String(value)} is not a canonical BCP 47 language tag.`);
  }

  return value;
}

const AcceptLanguageResolver = new GraphQLScalarType<string, string>({
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
