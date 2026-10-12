import * as v from 'valibot';
import { message } from 'server/Helpers/Validation/message.js';

export const SocialSignInSchema = v.object({
  Provider: v.picklist(['google', 'apple'], message('validation_provider')),
  Token: v.pipe(v.string(), v.minLength(1, message('validation_token_required'))),
});
