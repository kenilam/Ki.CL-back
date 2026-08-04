import * as v from 'valibot';

/**
 * A blank query would match everything, so it is rejected rather than answered
 * with the first page of the taxonomy. Two characters is the shortest prefix
 * that narrows anything usefully.
 */
export const TaxonSearchSchema = v.object({
  query: v.pipe(
    v.string(),
    v.trim(),
    v.minLength(2, 'Search needs at least two characters'),
    v.maxLength(120),
  ),
  limit: v.optional(
    v.pipe(v.number(), v.integer(), v.minValue(1), v.maxValue(50)),
    10,
  ),
});
