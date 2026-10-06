import * as v from 'valibot';

export const DeleteMeSchema = v.object({
  CurrentPassword: v.pipe(v.string(), v.minLength(1, 'Password is required')),
});
