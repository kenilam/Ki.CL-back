import * as v from 'valibot';
import { message } from 'server/Helpers/Validation/message.js';

export const RegisterSchema = v.object({
  email: v.pipe(v.string(), v.email(message('validation_email'))),
  password: v.pipe(
    v.string(),
    v.minLength(8, message('validation_password_min')),
    v.maxLength(128, message('validation_password_max')),
  ),
  firstName: v.optional(v.pipe(v.string(), v.maxLength(100))),
  lastName: v.optional(v.pipe(v.string(), v.maxLength(100))),
});
