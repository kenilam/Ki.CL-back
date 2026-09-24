import * as v from 'valibot';

export const MAX_TEXT_LENGTH = 150;

const ObjectId = v.pipe(v.string(), v.regex(/^[a-f0-9]{24}$/i, 'Not an id.'));

export const SendSchema = v.object({
  threadId: v.optional(v.nullable(ObjectId)),
  text: v.pipe(
    v.string(),
    v.trim(),
    v.minLength(1, 'Say something.'),
    v.maxLength(MAX_TEXT_LENGTH, `Keep it to ${MAX_TEXT_LENGTH} characters or fewer.`),
  ),
});

export const SimilarSchema = v.object({
  text: v.pipe(v.string(), v.trim(), v.maxLength(MAX_TEXT_LENGTH)),
});

export const ThreadSchema = v.object({
  id: ObjectId,
});

export const GallerySchema = v.object({
  limit: v.optional(v.nullable(v.pipe(v.number(), v.integer(), v.minValue(1), v.maxValue(24)))),
});

export const ThreadsSchema = v.object({
  limit: v.optional(v.nullable(v.pipe(v.number(), v.integer(), v.minValue(1), v.maxValue(50)))),
});
