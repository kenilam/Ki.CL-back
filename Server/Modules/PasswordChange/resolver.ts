import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';
import bcrypt from 'bcrypt';
import { v4 as uuid } from 'uuid';
import { validate } from 'server/Helpers/Validation/validate.js';
import {
  PasswordChangeCompleteSchema,
  PasswordChangeConfirmSchema,
  PasswordChangeRequestSchema,
} from './validation.js';
import { PasswordChanges } from 'server/DataSources/MongoDB/PasswordChanges/Model.js';
import { Users } from 'server/DataSources/MongoDB/Users/Model.js';
import { generatePassword } from 'server/DataSources/MongoDB/Utilities/generatePassword.js';
import { generateUserToken } from 'server/DataSources/MongoDB/Utilities/generateUserToken.js';
import { setAccessTokenCookie, setRefreshTokenCookie, setAudCookie } from 'server/Helpers/cookies.js';
import { Gmail } from 'server/DataSources/Google/index.js';
import { BadUserInput, TooManyRequests, Unauthenticated, Unavailable } from 'server/Errors/index.js';
import type { Context } from 'server/Context/index.js';
import { COMPLETE_MS, COOLDOWN_MS, LINK_MS, toResult, watch } from './status.js';

const sha256 = (value: string) => createHash('sha256').update(value).digest();

/** Where the emailed link points. Only development may fall back to the caller's origin. */
function confirmUrl(context: Context): string {
  const origin = context.headers.origin;

  const url =
    process.env.MAILER_PASSWORD_CHANGE_URL ||
    (process.env.NODE_ENV === 'development' && typeof origin === 'string'
      ? `${origin}/me/password/confirm`
      : undefined);

  if (!url) {
    throw Unavailable('Email is not available. Try again later.');
  }

  return url;
}

function requireUser(context: Context) {
  if (!context.user) {
    throw Unauthenticated('Authentication required');
  }

  return context.user;
}

export default {
  Query: {
    PasswordChange: async (_: unknown, __: unknown, context: Context) => {
      const { UserGUID } = requireUser(context);

      const doc = await PasswordChanges.findOne({ UserGUID });
      const result = doc && toResult(doc.PasswordChangeGUID, doc);

      return result?.status === 'EXPIRED' ? null : result;
    },
  },

  Mutation: {
    PasswordChangeRequest: async (
      _: unknown,
      args: { PasswordChangeRequest: unknown },
      context: Context,
    ) => {
      const { Email, UserGUID } = requireUser(context);
      const input = validate(PasswordChangeRequestSchema, args.PasswordChangeRequest);
      const url = confirmUrl(context);

      const user = await Users.findOne({ UserGUID, Active: true }, 'Password');

      // Checked before anything is sent, so a wrong password costs no email.
      if (!user || !(await bcrypt.compare(input.CurrentPassword, user.Password))) {
        throw BadUserInput('Current password is incorrect');
      }

      if (input.Password === input.CurrentPassword) {
        throw BadUserInput('The new password must be different from the current one.');
      }

      const earlier = await PasswordChanges.findOne({ UserGUID });

      if (earlier && earlier.createdAt.getTime() > Date.now() - COOLDOWN_MS) {
        throw TooManyRequests('A link was just sent. Wait a minute before asking for another.');
      }

      await PasswordChanges.deleteOne({ UserGUID });

      const id = uuid();
      const secret = randomBytes(32).toString('base64url');

      /*
       * Kept hashed with the request, not in the page: a reload would lose it
       * there. The link still sets nothing by itself, because the password is
       * the one given here, by someone who knew the current one.
       */
      const { hash } = await generatePassword({ password: input.Password });

      const doc = await PasswordChanges.create({
        PasswordChangeGUID: id,
        UserGUID,
        Secret: sha256(secret).toString('hex'),
        Password: hash,
        ExpiresAt: new Date(Date.now() + LINK_MS),
      });

      // After `#`, so the secret is never sent to a server or kept in its logs.
      await Gmail.send({
        to: Email,
        ...Gmail.emails.passwordChangeConfirm({ link: `${url}#${id}.${secret}` }),
      });

      return toResult(id, doc);
    },

    PasswordChangeConfirm: async (_: unknown, args: { PasswordChangeConfirm: unknown }) => {
      const input = validate(PasswordChangeConfirmSchema, args.PasswordChangeConfirm);

      const doc = await PasswordChanges.findOne({ PasswordChangeGUID: input.id });

      const matches =
        !!doc &&
        !doc.Confirmed &&
        doc.ExpiresAt.getTime() > Date.now() &&
        timingSafeEqual(sha256(input.secret), Buffer.from(doc.Secret, 'hex'));

      // One answer for every way it can fail, so it says nothing about a request.
      if (!matches) {
        throw BadUserInput('This link has expired or was already used.');
      }

      doc.Confirmed = true;
      doc.ExpiresAt = new Date(Date.now() + COMPLETE_MS);
      await doc.save();

      return true;
    },

    PasswordChangeComplete: async (
      _: unknown,
      args: { PasswordChangeComplete: unknown },
      context: Context,
    ) => {
      const { Email, UserGUID } = requireUser(context);
      const input = validate(PasswordChangeCompleteSchema, args.PasswordChangeComplete);

      // Deleted as it is read, so a confirmed request sets one password.
      const doc = await PasswordChanges.findOneAndDelete({
        PasswordChangeGUID: input.id,
        UserGUID,
        Confirmed: true,
        ExpiresAt: { $gt: new Date() },
      });

      // Already hashed, so it is written past the model's hook, which would hash it again.
      const saved = doc && (await Users.updateOne({ UserGUID, Active: true }, { Password: doc.Password }));

      if (!saved?.matchedCount) {
        throw BadUserInput('This password change was not confirmed in time.');
      }

      // New tokens replace the stored refresh token, so a session on another device can't renew.
      const { AccessToken, RefreshToken } = await generateUserToken({
        UserGUID,
        aud: 'user',
        human: context.tokenPayload?.human,
      });

      setAccessTokenCookie(context.res, AccessToken);
      setRefreshTokenCookie(context.res, RefreshToken);
      setAudCookie(context.res, 'user');

      // The password has changed either way, so a failed notice doesn't fail the request.
      await Gmail.send({
        to: Email,
        ...Gmail.emails.passwordChanged(),
      }).catch((error) => console.error('PasswordChange: notice not sent', error));

      return true;
    },
  },

  Subscription: {
    PasswordChangeUpdated: {
      subscribe: (_: unknown, args: { id: string }, context?: Context) => {
        if (!context?.user) {
          throw Unauthenticated('Authentication required');
        }

        return watch(args.id, context.user.UserGUID);
      },
    },
  },
};
