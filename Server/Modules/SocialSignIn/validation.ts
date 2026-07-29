import * as v from 'valibot';

export const SocialSignInSchema = v.object({
  Provider: v.picklist(['google', 'apple'], 'Provider must be google or apple'),
  Token: v.pipe(v.string(), v.minLength(1, 'Token is required')),
});
