import { GraphQLError } from 'graphql';

export function BadUserInput(message: string): GraphQLError {
  return new GraphQLError(message, {
    extensions: { code: 'BAD_USER_INPUT' },
  });
}

export function Forbidden(message: string = 'Access denied'): GraphQLError {
  return new GraphQLError(message, {
    extensions: { code: 'FORBIDDEN' },
  });
}

export function Unauthenticated(message: string = 'Authentication required'): GraphQLError {
  return new GraphQLError(message, {
    extensions: { code: 'UNAUTHENTICATED' },
  });
}

export function ExistingRecord(message: string = 'Record already exists'): GraphQLError {
  return new GraphQLError(message, {
    extensions: { code: 'EXISTING_RECORD' },
  });
}

export function NotFound(message: string = 'Record not found'): GraphQLError {
  return new GraphQLError(message, {
    extensions: { code: 'NOT_FOUND' },
  });
}

/** The client should show the Turnstile widget and retry with its token. */
export function CaptchaRequired(message: string = 'Confirm you are human to continue.'): GraphQLError {
  return new GraphQLError(message, {
    extensions: { code: 'CAPTCHA_REQUIRED' },
  });
}

/** Something we depend on could not answer. The client can only try again later. */
export function Unavailable(message: string = 'Service unavailable. Try again later.'): GraphQLError {
  return new GraphQLError(message, {
    extensions: { code: 'SERVICE_UNAVAILABLE' },
  });
}

export function TooManyRequests(
  message: string = 'Too many requests',
  extensions: Record<string, unknown> = {},
): GraphQLError {
  return new GraphQLError(message, {
    extensions: { code: 'TOO_MANY_REQUESTS', ...extensions },
  });
}
