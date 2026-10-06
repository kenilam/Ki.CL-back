import * as v from 'valibot';

export const UpdateMeSchema = v.object({
  FirstName: v.nullish(v.pipe(v.string(), v.trim(), v.maxLength(100))),
  LastName: v.nullish(v.pipe(v.string(), v.trim(), v.maxLength(100))),
});
