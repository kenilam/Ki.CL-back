import * as v from 'valibot';
import { GraphQLError } from 'graphql';

export function validate<
  TSchema extends v.GenericSchema,
>(schema: TSchema, data: unknown): v.InferOutput<TSchema> {
  const result = v.safeParse(schema, data);

  if (!result.success) {
    const firstIssue = result.issues[0];
    const message = firstIssue?.message || 'Validation failed';

    throw new GraphQLError(message, {
      extensions: {
        code: 'BAD_USER_INPUT',
        issues: result.issues.map((issue) => ({
          message: issue.message,
          path: issue.path?.map((p) => p.key),
        })),
      },
    });
  }

  return result.output;
}
