import { PasswordChanges, type IPasswordChange } from 'server/DataSources/MongoDB/PasswordChanges/Model.js';
import { PasswordChangeStatus, type PasswordChange } from 'server/Types/graphql.js';

/** How long the emailed link works. */
export const LINK_MS = 10 * 60 * 1000;

/** How long the page has to send the new password once the link is confirmed. */
export const COMPLETE_MS = 2 * 60 * 1000;

/** A user may ask for a new link this often. */
export const COOLDOWN_MS = 60 * 1000;

const POLL_MS = 2000;

/** Mongo's date, not the branded scalar. */
export type PasswordChangeResult = Omit<PasswordChange, '__typename' | 'expiresAt'> & {
  expiresAt: Date;
};

export function toResult(id: string, doc: IPasswordChange | null): PasswordChangeResult {
  if (!doc || doc.ExpiresAt.getTime() <= Date.now()) {
    return { id, status: PasswordChangeStatus.Expired, expiresAt: doc?.ExpiresAt ?? new Date() };
  }

  return { id, status: doc.Confirmed ? PasswordChangeStatus.Confirmed : PasswordChangeStatus.Pending, expiresAt: doc.ExpiresAt };
}

const read = async (id: string, UserGUID: string) =>
  toResult(id, await PasswordChanges.findOne({ PasswordChangeGUID: id, UserGUID }));

/**
 * The request's status, read from Mongo every two seconds and passed on when
 * it changes. It ends after CONFIRMED or EXPIRED.
 *
 * Read rather than published: the link is often opened on another instance
 * than the one holding this socket, and the in-process PubSub would not reach
 * it. Reading also covers the expiry, with no timer to keep.
 */
export function watch(
  id: string,
  UserGUID: string,
): AsyncIterableIterator<{ PasswordChangeUpdated: PasswordChangeResult }> {
  let last: PasswordChangeStatus | undefined;
  let closed = false;

  const done = { value: undefined, done: true } as const;

  return {
    async next() {
      while (!closed && last !== PasswordChangeStatus.Confirmed && last !== PasswordChangeStatus.Expired) {
        const result = await read(id, UserGUID);

        if (result.status !== last) {
          last = result.status;
          return { value: { PasswordChangeUpdated: result }, done: false };
        }

        await new Promise((resolve) => setTimeout(resolve, POLL_MS));
      }

      return done;
    },
    // The page closed or stopped listening, so the reads stop.
    async return() {
      closed = true;
      return done;
    },
    [Symbol.asyncIterator]() {
      return this;
    },
  };
}
