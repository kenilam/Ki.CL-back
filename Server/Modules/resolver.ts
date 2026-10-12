import {
  DateTimeResolver,
  EmailAddressResolver,
  UUIDResolver,
  JWTResolver,
  URLResolver,
  NonEmptyStringResolver,
  JSONObjectResolver,
} from 'graphql-scalars';

export default {
  DateTime: DateTimeResolver,
  EmailAddress: EmailAddressResolver,
  UUID: UUIDResolver,
  JWT: JWTResolver,
  URL: URLResolver,
  NonEmptyString: NonEmptyStringResolver,
  JSONObject: JSONObjectResolver,
};
