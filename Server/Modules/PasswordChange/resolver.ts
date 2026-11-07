import { createHash, randomBytes, randomUUID, timingSafeEqual } from 'node:crypto';
import bcrypt from 'bcrypt';
import { validate } from 'server/Helpers/Validation/validate.js';
import {
  PasswordChangeCompleteSchema,
  PasswordChangeConfirmSchema,
  PasswordChangeRequestSchema,
} from './validation.js';
import { PasswordChanges } from 'server/DataSources/MongoDB/PasswordChanges/Model.js';
import { Users } from 'server/DataSources/MongoDB/Users/Model.js';
import { generatePassword } from 'server/DataSources/MongoDB/Utilities/generatePassword.js';
import { generateUserToken } from 'server/DataSources/MongoDB/UserTokens/generateUserToken.js';
import { setAccessTokenCookie, setRefreshTokenCookie, setAudCookie } from 'server/Helpers/cookies.js';
import { Gmail } from 'server/DataSources/Google/index.js';
import { BadUserInput, TooManyRequests, Unauthenticated, Unavailable } from 'server/Errors/index.js';
import type { Context } from 'server/Context/index.js';
import { notifyChange } from './notify.js';
import { COMPLETE_MS, COOLDOWN_MS, LINK_MS, toResult, watch } from './status.js';
import { translate } from 'server/Helpers/translate.js';
import { PasswordChangeStatus } from 'server/Types/graphql.js';

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
    throw Unavailable(translate('api', 'error_email_unavailable'));
  }

  return url;
}

/** The request an emailed link points to, while the link can still be confirmed. */
async function findConfirmable(input: { id: string; secret: string }) {
  const doc = await PasswordChanges.findOne({ passwordChangeGUID: input.id });

  const matches =
    !!doc &&
    !doc.confirmed &&
    doc.expiresAt.getTime() > Date.now() &&
    timingSafeEqual(sha256(input.secret), Buffer.from(doc.secret, 'hex'));

  return matches ? doc : null;
}

function requireUser(context: Context) {
  if (!context.user) {
    throw Unauthenticated();
  }

  return context.user;
}

export default {
  Query: {
    passwordChange: async (_: unknown, __: unknown, context: Context) => {
      const { userGUID } = requireUser(context);

      const doc = await PasswordChanges.findOne({ userGUID });
      const result = doc && toResult(doc.passwordChangeGUID, doc);

      return result?.status === PasswordChangeStatus.Expired ? null : result;
    },

    // Lets the link's page say it is spent before offering to confirm it again.
    passwordChangeLink: async (_: unknown, args: { passwordChangeLink: unknown }) => {
      const input = validate(PasswordChangeConfirmSchema, args.passwordChangeLink);

      return Boolean(await findConfirmable(input));
    },
  },

  Mutation: {
    passwordChangeRequest: async (
      _: unknown,
      args: { passwordChangeRequest: unknown },
      context: Context,
    ) => {
      const { email, userGUID } = requireUser(context);
      const input = validate(PasswordChangeRequestSchema, args.passwordChangeRequest);
      const url = confirmUrl(context);

      const user = await Users.findOne({ userGUID, active: true }, 'password');

      // Checked before anything is sent, so a wrong password costs no email.
      if (!user || !(await bcrypt.compare(input.currentPassword, user.password))) {
        throw BadUserInput(translate('api', 'error_password_current_incorrect'));
      }

      if (input.password === input.currentPassword) {
        throw BadUserInput(translate('api', 'error_password_unchanged'));
      }

      const earlier = await PasswordChanges.findOne({ userGUID });

      if (earlier && earlier.createdAt.getTime() > Date.now() - COOLDOWN_MS) {
        throw TooManyRequests(translate('api', 'error_password_link_cooldown'));
      }

      await PasswordChanges.deleteOne({ userGUID });

      const id = randomUUID();
      const secret = randomBytes(32).toString('base64url');

      /*
       * Kept hashed with the request, not in the page: a reload would lose it
       * there. The link still sets nothing by itself, because the password is
       * the one given here, by someone who knew the current one.
       */
      const { hash } = await generatePassword({ password: input.password });

      const doc = await PasswordChanges.create({
        passwordChangeGUID: id,
        userGUID,
        secret: sha256(secret).toString('hex'),
        password: hash,
        expiresAt: new Date(Date.now() + LINK_MS),
      });

      // After `#`, so the secret is never sent to a server or kept in its logs.
      await Gmail.send({
        to: email,
        ...Gmail.emails.passwordChangeConfirm({ link: `${url}#${id}.${secret}`, minutes: LINK_MS / 60_000 }),
      });

      await notifyChange(userGUID, id, 'waiting');

      return toResult(id, doc);
    },

    passwordChangeConfirm: async (_: unknown, args: { passwordChangeConfirm: unknown }) => {
      const input = validate(PasswordChangeConfirmSchema, args.passwordChangeConfirm);

      const doc = await findConfirmable(input);

      // One answer for every way it can fail, so it says nothing about a request.
      if (!doc) {
        throw BadUserInput(translate('api', 'error_password_link_expired'));
      }

      doc.confirmed = true;
      doc.expiresAt = new Date(Date.now() + COMPLETE_MS);
      await doc.save();

      return true;
    },

    passwordChangeComplete: async (
      _: unknown,
      args: { passwordChangeComplete: unknown },
      context: Context,
    ) => {
      const { email, userGUID } = requireUser(context);
      const input = validate(PasswordChangeCompleteSchema, args.passwordChangeComplete);

      // Deleted as it is read, so a confirmed request sets one password.
      const doc = await PasswordChanges.findOneAndDelete({
        passwordChangeGUID: input.id,
        userGUID,
        confirmed: true,
        expiresAt: { $gt: new Date() },
      });

      // Already hashed, so it is written past the model's hook, which would hash it again.
      const saved = doc && (await Users.updateOne({ userGUID, active: true }, { password: doc.password }));

      if (!saved?.matchedCount) {
        await notifyChange(userGUID, input.id, 'failed');
        throw BadUserInput(translate('api', 'error_password_change_unconfirmed'));
      }

      // New tokens replace the stored refresh token, so a session on another device can't renew.
      const { accessToken, refreshToken } = await generateUserToken({
        userGUID,
        aud: 'user',
        human: context.tokenPayload?.human,
      });

      setAccessTokenCookie(context.res, accessToken);
      setRefreshTokenCookie(context.res, refreshToken);
      setAudCookie(context.res, 'user');

      // The password has changed either way, so a failed notice doesn't fail the request.
      await Gmail.send({
        to: email,
        ...Gmail.emails.passwordChanged(),
      }).catch((error) => console.error('PasswordChange: notice not sent', error));

      await notifyChange(userGUID, input.id, 'done');

      return true;
    },
  },

  Subscription: {
    passwordChangeUpdated: {
      subscribe: (_: unknown, args: { id: string }, context?: Context) => {
        if (!context?.user) {
          throw Unauthenticated();
        }

        return watch(args.id, context.user.userGUID);
      },
    },
  },
};
