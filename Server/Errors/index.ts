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
