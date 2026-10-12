import * as v from 'valibot';
import { message } from 'server/Helpers/Validation/message.js';

export const MAX_TEXT_LENGTH = 150;

const ObjectId = v.pipe(v.string(), v.regex(/^[a-f0-9]{24}$/i, message('image_agent_validation_id')));

export const SendSchema = v.object({
  threadId: v.optional(v.nullable(ObjectId)),
  text: v.pipe(
    v.string(),
    v.trim(),
    v.minLength(1, message('image_agent_validation_text_required')),
    v.maxLength(MAX_TEXT_LENGTH, message('image_agent_validation_text_max', { count: MAX_TEXT_LENGTH })),
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
