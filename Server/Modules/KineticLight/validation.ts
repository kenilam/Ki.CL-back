import * as v from 'valibot';
import { message } from 'server/Helpers/Validation/message.js';

export const MAX_FILE_BYTES = 8 * 1024 * 1024;
export const MAX_FILE_SIZE = '8 MB';

const MAX_TEXT_LENGTH = 120;

const Text = v.pipe(
  v.string(),
  v.trim(),
  v.minLength(1),
  v.transform((text) => text.slice(0, MAX_TEXT_LENGTH)),
);

const Data = (length: number) => v.pipe(
  v.string(),
  v.minLength(1, message('kinetic_light_error_empty')),
  v.maxLength(length, message('kinetic_light_error_too_large', { size: MAX_FILE_SIZE })),
);

export const ReadSchema = v.object({
  file: v.object({
    name: Text,
    data: Data(Math.ceil(MAX_FILE_BYTES / 3) * 4),
  }),
});

const MAX_BARS = 512;

export const ArrangeSchema = v.object(
  {
    id: v.string(),
    outline: v.object({
      title: Text,
      tempo: v.pipe(v.number(), v.minValue(20), v.maxValue(300)),
      beatsPerBar: v.pipe(v.number(), v.integer(), v.minValue(1), v.maxValue(16)),
      steps: v.picklist([2, 3, 4]),
      bars: v.pipe(
        v.array(v.pipe(v.string(), v.regex(/^[bx.]{1,64}$/))),
        v.minLength(1),
        v.maxLength(MAX_BARS),
      ),
    }),
  },
  message('kinetic_light_error_arrange'),
);

export const SaveSchema = v.object({
  song: v.union(
    [
      v.object({ title: Text, midi: Data(Math.ceil(MAX_FILE_BYTES / 3) * 4), musicxml: v.nullish(v.null()) }),
      v.object({ title: Text, midi: v.nullish(v.null()), musicxml: Data(MAX_FILE_BYTES) }),
    ],
    message('kinetic_light_error_song'),
  ),
});

export type Outline = v.InferOutput<typeof ArrangeSchema>['outline'];
