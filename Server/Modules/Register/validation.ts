import * as v from 'valibot';

export const RegisterSchema = v.object({
  Email: v.pipe(v.string(), v.email('Invalid email address')),
  Password: v.pipe(
    v.string(),
    v.minLength(8, 'Password must be at least 8 characters'),
    v.maxLength(128, 'Password must not exceed 128 characters'),
  ),
  FirstName: v.optional(v.pipe(v.string(), v.maxLength(100))),
  LastName: v.optional(v.pipe(v.string(), v.maxLength(100))),
});
