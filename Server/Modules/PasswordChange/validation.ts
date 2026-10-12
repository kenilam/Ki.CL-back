import * as v from 'valibot';
import { message } from 'server/Helpers/Validation/message.js';

export const PasswordChangeRequestSchema = v.object({
  CurrentPassword: v.pipe(v.string(), v.minLength(1, message('validation_password_required'))),
  Password: v.pipe(
    v.string(),
    v.minLength(8, message('validation_password_min')),
    v.maxLength(128, message('validation_password_max')),
  ),
});

export const PasswordChangeConfirmSchema = v.object({
  id: v.pipe(v.string(), v.minLength(1)),
  secret: v.pipe(v.string(), v.minLength(1)),
});

export const PasswordChangeCompleteSchema = v.object({
  id: v.pipe(v.string(), v.minLength(1)),
});
