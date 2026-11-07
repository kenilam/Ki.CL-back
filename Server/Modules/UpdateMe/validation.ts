import * as v from 'valibot';

export const UpdateMeSchema = v.object({
  firstName: v.nullish(v.pipe(v.string(), v.trim(), v.maxLength(100))),
  lastName: v.nullish(v.pipe(v.string(), v.trim(), v.maxLength(100))),
});
