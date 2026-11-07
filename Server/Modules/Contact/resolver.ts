import { randomUUID } from 'node:crypto';
import { validate } from 'server/Helpers/Validation/validate.js';
import { ContactSchema } from './validation.js';
import { ContactMessages } from 'server/DataSources/MongoDB/ContactMessages/Model.js';
import { Gmail } from 'server/DataSources/Google/index.js';
import { CaptchaRequired, Unauthenticated, Unavailable } from 'server/Errors/index.js';
import type { Context } from 'server/Context/index.js';
import { assertWithinQuota, retentionMs } from './quota.js';
import { translate } from 'server/Helpers/translate.js';

/** The inbox messages go to. Development has no mailer, so any name will do there. */
function inbox(): string {
  const address =
    process.env.MAILER_CONTACT ||
    process.env.MAILER_USER ||
    (process.env.NODE_ENV === 'development' ? 'inbox' : undefined);

  if (!address) {
    throw Unavailable(translate('api', 'error_email_unavailable'));
  }

  return address;
}

export default {
  Mutation: {
    contact: async (_: unknown, args: { contact: unknown }, context: Context) => {
      const userGUID = context.tokenPayload?.userGUID;

      if (!userGUID) {
        throw Unauthenticated();
      }

      // Each message sends two emails, so a session that has not passed Turnstile sends none.
      if (!context.tokenPayload?.human) {
        throw CaptchaRequired();
      }

      const { email, message } = validate(ContactSchema, args.contact);
      const to = inbox();

      await assertWithinQuota({ userGUID, email });

      const doc = await ContactMessages.create({
        contactMessageGUID: randomUUID(),
        userGUID,
        email,
        message,
        expiresAt: new Date(Date.now() + retentionMs()),
      });

      try {
        await Gmail.send({ to, replyTo: email, ...Gmail.emails.contactMessage({ email, message }) });
      } catch (error) {
        // Not kept, so trying again is not counted against the sender.
        await doc.deleteOne();
        throw error;
      }

      // The message has arrived either way, so a failed acknowledgement doesn't fail the request.
      await Gmail.send({
        to: email,
        ...Gmail.emails.contactReceived(),
      }).catch((error) => console.error('Contact: acknowledgement not sent', error));

      return true;
    },
  },
};
