import * as v from 'valibot';
import { message } from 'server/Helpers/Validation/message.js';

export const SocialSignInSchema = v.object({
  provider: v.picklist(['google', 'apple'], message('validation_provider')),
  token: v.pipe(v.string(), v.minLength(1, message('validation_token_required'))),
});
