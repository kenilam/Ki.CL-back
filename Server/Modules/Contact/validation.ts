import * as v from 'valibot';

export const ContactSchema = v.object({
  Email: v.pipe(
    v.string(),
    v.trim(),
    v.toLowerCase(),
    v.email('Invalid email address'),
    // The longest address a mail server accepts.
    v.maxLength(254, 'Invalid email address'),
  ),
  Message: v.pipe(
    v.string(),
    v.trim(),
    v.minLength(1, 'Message is required'),
    v.maxLength(5000, 'Message must not exceed 5000 characters'),
  ),
});
