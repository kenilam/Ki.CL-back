import * as v from 'valibot';

export const TaxonVisualSchema = v.object({
  ottId: v.pipe(v.number(), v.integer(), v.minValue(1)),
  name: v.pipe(v.string(), v.minLength(1), v.maxLength(200)),
  rank: v.optional(v.nullable(v.pipe(v.string(), v.maxLength(80)))),
});
