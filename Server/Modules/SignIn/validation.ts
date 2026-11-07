import * as v from 'valibot';
import { message } from 'server/Helpers/Validation/message.js';

export const SignInSchema = v.object({
  email: v.pipe(v.string(), v.email(message('validation_email'))),
  password: v.pipe(v.string(), v.minLength(1, message('validation_password_required'))),
});
