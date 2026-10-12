import { GraphQLError } from 'graphql';
import { translate } from 'server/Helpers/translate.js';

/*
 * Each factory takes the message as it should be read, already translated.
 * The defaults are read on every call, because the text can change in the
 * database while the server runs.
 */

export function BadUserInput(message: string): GraphQLError {
  return new GraphQLError(message, {
    extensions: { code: 'BAD_USER_INPUT' },
  });
}

export function Forbidden(message: string = translate('api', 'error_forbidden')): GraphQLError {
  return new GraphQLError(message, {
    extensions: { code: 'FORBIDDEN' },
  });
}

export function Unauthenticated(message: string = translate('api', 'error_unauthenticated')): GraphQLError {
  return new GraphQLError(message, {
    extensions: { code: 'UNAUTHENTICATED' },
  });
}

export function ExistingRecord(message: string = translate('api', 'error_existing_record')): GraphQLError {
  return new GraphQLError(message, {
    extensions: { code: 'EXISTING_RECORD' },
  });
}

export function NotFound(message: string = translate('api', 'error_not_found')): GraphQLError {
  return new GraphQLError(message, {
    extensions: { code: 'NOT_FOUND' },
  });
}

/** The client should show the Turnstile widget and retry with its token. */
export function CaptchaRequired(message: string = translate('api', 'error_captcha_required')): GraphQLError {
  return new GraphQLError(message, {
    extensions: { code: 'CAPTCHA_REQUIRED' },
  });
}

/** Something we depend on could not answer. The client can only try again later. */
export function Unavailable(message: string = translate('api', 'error_unavailable')): GraphQLError {
  return new GraphQLError(message, {
    extensions: { code: 'SERVICE_UNAVAILABLE' },
  });
}

export function TooManyRequests(
  message: string = translate('api', 'error_too_many_requests'),
  extensions: Record<string, unknown> = {},
): GraphQLError {
  return new GraphQLError(message, {
    extensions: { code: 'TOO_MANY_REQUESTS', ...extensions },
  });
}
