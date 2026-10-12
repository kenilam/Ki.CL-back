import * as v from 'valibot';
import { message } from 'server/Helpers/Validation/message.js';

export const SignInSchema = v.object({
  Email: v.pipe(v.string(), v.email(message('validation_email'))),
  Password: v.pipe(v.string(), v.minLength(1, message('validation_password_required'))),
});
