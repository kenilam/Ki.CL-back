import { v4 as uuid } from 'uuid';
import { validate } from 'server/Helpers/Validation/validate.js';
import { ContactSchema } from './validation.js';
import { ContactMessages } from 'server/DataSources/MongoDB/ContactMessages/Model.js';
import { Gmail } from 'server/DataSources/Google/index.js';
import { CaptchaRequired, Unauthenticated, Unavailable } from 'server/Errors/index.js';
import type { Context } from 'server/Context/index.js';
import { assertWithinQuota, retentionMs } from './quota.js';

/** The inbox messages go to. Development has no mailer, so any name will do there. */
function inbox(): string {
  const address =
    process.env.MAILER_CONTACT ||
    process.env.MAILER_USER ||
    (process.env.NODE_ENV === 'development' ? 'inbox' : undefined);

  if (!address) {
    throw Unavailable('Email is not available. Try again later.');
  }

  return address;
}

export default {
  Mutation: {
    Contact: async (_: unknown, args: { Contact: unknown }, context: Context) => {
      const UserGUID = context.tokenPayload?.UserGUID;

      if (!UserGUID) {
        throw Unauthenticated('Authentication required');
      }

      // Each message sends two emails, so a session that has not passed Turnstile sends none.
      if (!context.tokenPayload?.human) {
        throw CaptchaRequired();
      }

      const { Email, Message } = validate(ContactSchema, args.Contact);
      const to = inbox();

      await assertWithinQuota({ UserGUID, Email });

      const doc = await ContactMessages.create({
        ContactMessageGUID: uuid(),
        UserGUID,
        Email,
        Message,
        ExpiresAt: new Date(Date.now() + retentionMs()),
      });

      try {
        await Gmail.send({ to, replyTo: Email, ...Gmail.emails.contactMessage({ Email, Message }) });
      } catch (error) {
        // Not kept, so trying again is not counted against the sender.
        await doc.deleteOne();
        throw error;
      }

      // The message has arrived either way, so a failed acknowledgement doesn't fail the request.
      await Gmail.send({
        to: Email,
        ...Gmail.emails.contactReceived(),
      }).catch((error) => console.error('Contact: acknowledgement not sent', error));

      return true;
    },
  },
};
