import * as v from 'valibot';

export const SignInSchema = v.object({
  Email: v.pipe(v.string(), v.email('Invalid email address')),
  Password: v.pipe(v.string(), v.minLength(1, 'Password is required')),
});
