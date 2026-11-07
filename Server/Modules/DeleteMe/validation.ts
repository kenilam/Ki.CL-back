import * as v from 'valibot';
import { message } from 'server/Helpers/Validation/message.js';

export const DeleteMeSchema = v.object({
  currentPassword: v.pipe(v.string(), v.minLength(1, message('validation_password_required'))),
});
