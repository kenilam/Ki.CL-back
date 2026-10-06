import * as v from 'valibot';

export const PasswordChangeRequestSchema = v.object({
  CurrentPassword: v.pipe(v.string(), v.minLength(1, 'Password is required')),
  Password: v.pipe(
    v.string(),
    v.minLength(8, 'Password must be at least 8 characters'),
    v.maxLength(128, 'Password must not exceed 128 characters'),
  ),
});

export const PasswordChangeConfirmSchema = v.object({
  id: v.pipe(v.string(), v.minLength(1)),
  secret: v.pipe(v.string(), v.minLength(1)),
});

export const PasswordChangeCompleteSchema = v.object({
  id: v.pipe(v.string(), v.minLength(1)),
});
