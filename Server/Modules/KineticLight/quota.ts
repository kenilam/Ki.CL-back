import { KineticLightReadings } from 'server/DataSources/MongoDB/KineticLightReadings/Model.js';
import { TooManyRequests } from 'server/Errors/index.js';
import { translate } from 'server/Helpers/translate.js';
import { KineticLightSource, KineticLightStatus } from 'server/Types/graphql.js';

const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;

function envNumber(name: string, fallback: number): number {
  const value = Number(process.env[name]);
  return Number.isFinite(value) && value >= 0 ? value : fallback;
}

export async function allowanceFor(ownerGUID: string) {
  const now = Date.now();
  const dayAgo = new Date(now - DAY_MS);
  const hourAgo = new Date(now - HOUR_MS);
  const limit = envNumber('KINETIC_LIGHT_DAILY_LIMIT_PER_USER', 10);

  const sheets = { source: KineticLightSource.Sheet };

  const [busy, last, runs, everyone, recent] = await Promise.all([
    KineticLightReadings.exists({ ownerGUID, status: KineticLightStatus.Reading }),
    KineticLightReadings.findOne({ ownerGUID, ...sheets }).sort({ createdAt: -1 }).select('createdAt').lean(),
    KineticLightReadings.countDocuments({ ownerGUID, ...sheets, createdAt: { $gte: dayAgo } }),
    KineticLightReadings.countDocuments({ ...sheets, createdAt: { $gte: dayAgo } }),
    KineticLightReadings.distinct<string>('ownerGUID', { ...sheets, createdAt: { $gte: hourAgo } }),
  ]);

  const pauseEnds = (last?.createdAt.getTime() ?? 0) + envNumber('KINETIC_LIGHT_MIN_INTERVAL_SECONDS', 30) * 1000;

  const closed = everyone >= envNumber('KINETIC_LIGHT_DAILY_LIMIT_GLOBAL', 200)
    || (!recent.includes(ownerGUID) && recent.length >= envNumber('KINETIC_LIGHT_HOURLY_USERS', 10));

  return {
    remaining: closed ? 0 : Math.max(0, limit - runs),
    limit,
    nextAllowedAt: pauseEnds > now ? new Date(pauseEnds) : null,
    busy: Boolean(busy),
  };
}

export async function assertWithinQuota(ownerGUID: string): Promise<void> {
  const allowance = await allowanceFor(ownerGUID);

  if (allowance.busy) {
    throw TooManyRequests(translate('api', 'kinetic_light_error_busy'));
  }

  if (allowance.nextAllowedAt) {
    throw TooManyRequests(translate('api', 'kinetic_light_error_too_soon'));
  }

  if (allowance.remaining <= 0) {
    throw TooManyRequests(translate('api', 'kinetic_light_error_limit'));
  }
}

export async function assertWithinSaveQuota(ownerGUID: string): Promise<void> {
  const saved = await KineticLightReadings.countDocuments({
    ownerGUID,
    source: KineticLightSource.File,
    createdAt: { $gte: new Date(Date.now() - DAY_MS) },
  });

  if (saved >= envNumber('KINETIC_LIGHT_DAILY_SAVES_PER_USER', 50)) {
    throw TooManyRequests(translate('api', 'kinetic_light_error_limit'));
  }
}
