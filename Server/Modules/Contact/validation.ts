import * as v from 'valibot';
import { message } from 'server/Helpers/Validation/message.js';

export const ContactSchema = v.object({
  Email: v.pipe(
    v.string(),
    v.trim(),
    v.toLowerCase(),
    v.email(message('validation_email')),
    // The longest address a mail server accepts.
    v.maxLength(254, message('validation_email')),
  ),
  Message: v.pipe(
    v.string(),
    v.trim(),
    v.minLength(1, message('validation_message_required')),
    v.maxLength(5000, message('validation_message_max')),
  ),
});
