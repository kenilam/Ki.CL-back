import { SOURCE } from 'server/DataSources/MongoDB/Locales/Model.js';
import { withAcceptLanguages } from 'server/Helpers/acceptLanguage.js';
import { render, t } from './render.js';

/** The message as it reaches the inbox. Replying answers the sender. */
export const contactMessage = ({ Email, Message }: { Email: string; Message: string }) => {
  return withAcceptLanguages([SOURCE], () => {
    const subject = t('contact_message_subject', { email: Email });

    return {
      subject,
      html: render('contactMessage', { message: Message, subject }),
      // For clients that don't show HTML.
      text: Message,
    };
  });
};
