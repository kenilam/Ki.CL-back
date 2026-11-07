import { withFilter } from 'graphql-subscriptions';
import { mongo, Types } from 'mongoose';

import type { Context } from 'server/Context/index.js';
import { KineticLightReadings } from 'server/DataSources/MongoDB/KineticLightReadings/Model.js';
import {
  BadUserInput,
  CaptchaRequired,
  NotFound,
  TooManyRequests,
  Unauthenticated,
  Unavailable,
} from 'server/Errors/index.js';
import { translate } from 'server/Helpers/translate.js';
import { validate } from 'server/Helpers/Validation/validate.js';
import { KineticLightSource, KineticLightStage, KineticLightStatus } from 'server/Types/graphql.js';
import { arrange } from './arrange.js';
import { KINETIC_LIGHT_READING_UPDATED, kineticLightPubSub } from './pubsub.js';
import { allowanceFor, assertWithinQuota, assertWithinSaveQuota } from './quota.js';
import { recoverStalled } from './recover.js';
import { toResult, toSong, type ReadingResult } from './result.js';
import { runReading } from './run.js';
import { ArrangeSchema, MAX_FILE_BYTES, MAX_FILE_SIZE, ReadSchema, SaveSchema } from './validation.js';

const DUPLICATE_KEY = 11000;
const EXTENSION = /\.[a-z0-9]+$/i;
const SIGNATURES: [string, string][] = [
  ['25504446', 'application/pdf'],
  ['89504e47', 'image/png'],
  ['ffd8ff', 'image/jpeg'],
  ['47494638', 'image/gif'],
];

function requireOwner(context: Context): string {
  const owner = context.tokenPayload?.userGUID;
  if (!owner) {
    throw Unauthenticated();
  }
  return owner;
}

function requireHuman(context: Context): string {
  const owner = requireOwner(context);
  if (!context.tokenPayload?.human) {
    throw CaptchaRequired();
  }
  return owner;
}

function mimeOf(bytes: Buffer): string | null {
  const isWebp = bytes.subarray(0, 4).toString('latin1') === 'RIFF'
    && bytes.subarray(8, 12).toString('latin1') === 'WEBP';

  if (isWebp) {
    return 'image/webp';
  }

  const hex = bytes.subarray(0, 4).toString('hex');

  return SIGNATURES.find(([signature]) => hex.startsWith(signature))?.[1] ?? null;
}

async function start(ownerGUID: string, name: string) {
  try {
    return await KineticLightReadings.create({
      ownerGUID,
      title: name.replace(EXTENSION, '') || name,
      source: KineticLightSource.Sheet,
      status: KineticLightStatus.Reading,
      stage: KineticLightStage.Notes,
    });
  } catch (error) {
    if (error instanceof mongo.MongoServerError && error.code === DUPLICATE_KEY) {
      throw TooManyRequests(translate('api', 'kinetic_light_error_busy'));
    }
    throw error;
  }
}

export default {
  KineticLightReading: {
    failure: (reading: ReadingResult) =>
      reading.failure ? translate('api', 'kinetic_light_error', { context: reading.failure }) : null,
    mine: (reading: ReadingResult, _: unknown, context: Context) =>
      reading.ownerGUID === context.tokenPayload?.userGUID,
  },
  Query: {
    kineticLightReadings: async (_: unknown, __: unknown, context: Context) => {
      const owner = requireOwner(context);

      await recoverStalled(owner);

      const readings = await KineticLightReadings.find({ ownerGUID: owner, dismissedAt: null })
        .sort({ createdAt: -1 })
        .lean();

      return readings.map(toResult);
    },
    kineticLightSongs: async (_: unknown, __: unknown, context: Context) => {
      const owner = requireOwner(context);

      const songs = await KineticLightReadings.find({ ownerGUID: owner, status: KineticLightStatus.Ready })
        .sort({ createdAt: -1 })
        .select('title source createdAt')
        .lean();

      return songs.map(toSong);
    },
    kineticLightExamples: async (_: unknown, __: unknown, context: Context) => {
      requireOwner(context);

      const examples = await KineticLightReadings.find({ example: true, status: KineticLightStatus.Ready })
        .sort({ createdAt: 1 })
        .select('title source createdAt')
        .lean();

      return examples.map(toSong);
    },
    kineticLightAllowance: async (_: unknown, __: unknown, context: Context) => {
      const owner = requireOwner(context);

      await recoverStalled(owner);

      return allowanceFor(owner);
    },
    kineticLightReading: async (_: unknown, args: { id: string }, context: Context) => {
      requireOwner(context);

      if (!Types.ObjectId.isValid(args.id)) {
        return null;
      }

      const reading = await KineticLightReadings.findById(args.id).lean();

      return reading ? toResult(reading) : null;
    },
  },
  Mutation: {
    kineticLightRead: async (
      _: unknown,
      args: { file: { name: string; data: string } },
      context: Context,
    ) => {
      const owner = requireHuman(context);
      const { file } = validate(ReadSchema, args);
      const bytes = Buffer.from(file.data, 'base64');

      if (bytes.length === 0) {
        throw BadUserInput(translate('api', 'kinetic_light_error_empty'));
      }

      if (bytes.length > MAX_FILE_BYTES) {
        throw BadUserInput(translate('api', 'kinetic_light_error_too_large', { size: MAX_FILE_SIZE }));
      }

      const mime = mimeOf(bytes);

      if (!mime) {
        throw BadUserInput(translate('api', 'kinetic_light_error_type'));
      }

      await recoverStalled(owner);
      await assertWithinQuota(owner);

      const reading = await start(owner, file.name);

      runReading(reading._id, file.name, bytes, mime).catch((error: Error) => {
        console.error(`[KineticLight] "${file.name}" was not read: ${error.message}`);
      });

      return toResult(reading);
    },
    kineticLightSave: async (
      _: unknown,
      args: { song: { title: string; midi?: string | null; musicxml?: string | null } },
      context: Context,
    ) => {
      const owner = requireHuman(context);
      const { song } = validate(SaveSchema, args);
      const midi = song.midi ? Buffer.from(song.midi, 'base64') : null;
      const isMusicXml = song.musicxml ? /<score-(?:partwise|timewise)\b/.test(song.musicxml) : false;

      if (midi ? midi.subarray(0, 4).toString('latin1') !== 'MThd' : !isMusicXml) {
        throw BadUserInput(translate('api', 'kinetic_light_error_song'));
      }

      await assertWithinSaveQuota(owner);

      const reading = await KineticLightReadings.create({
        ownerGUID: owner,
        title: song.title,
        source: KineticLightSource.File,
        status: KineticLightStatus.Ready,
        midi: song.midi ?? null,
        musicxml: song.musicxml ?? null,
        dismissedAt: new Date(),
      });

      return toResult(reading);
    },
    kineticLightArrange: async (_: unknown, args: unknown, context: Context) => {
      const owner = requireHuman(context);
      const { id, outline } = validate(ArrangeSchema, args);

      if (!Types.ObjectId.isValid(id)) {
        throw NotFound();
      }

      const song = await KineticLightReadings
        .findOne({ _id: id, ownerGUID: owner, status: KineticLightStatus.Ready })
        .lean();

      if (!song) {
        throw NotFound();
      }

      if (song.arrangement) {
        return toResult(song);
      }

      const arrangement = await arrange(outline, song.chords).catch((error: Error) => {
        console.error(`[KineticLight] "${song.title}" could not be arranged: ${error.message}`);
        throw Unavailable(translate('api', 'kinetic_light_error_arrange'));
      });
      const arranged = await KineticLightReadings
        .findOneAndUpdate({ _id: song._id, arrangement: null }, { arrangement }, { new: true })
        .lean();

      return toResult(arranged ?? (await KineticLightReadings.findById(song._id).lean()) ?? song);
    },
    kineticLightDismiss: async (_: unknown, args: { id: string }, context: Context) => {
      const owner = requireOwner(context);

      if (!Types.ObjectId.isValid(args.id)) {
        return args.id;
      }

      await KineticLightReadings.updateOne(
        {
          _id: args.id,
          ownerGUID: owner,
          status: { $ne: KineticLightStatus.Reading },
          dismissedAt: null,
        },
        { dismissedAt: new Date() },
      );

      return args.id;
    },
  },
  Subscription: {
    kineticLightReadingUpdated: {
      subscribe: withFilter(
        (_parent, _args, context?: Context) => {
          if (!context) {
            throw Unauthenticated();
          }
          requireOwner(context);
          return kineticLightPubSub.asyncIterableIterator(KINETIC_LIGHT_READING_UPDATED);
        },
        (
          payload: { kineticLightReadingUpdated?: ReadingResult } | undefined,
          _variables: unknown,
          context?: Context,
        ) => Boolean(
          payload?.kineticLightReadingUpdated
          && payload.kineticLightReadingUpdated.ownerGUID === context?.tokenPayload?.userGUID,
        ),
      ),
    },
  },
};
