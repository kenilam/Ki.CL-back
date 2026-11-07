import { SOURCE } from 'server/DataSources/MongoDB/Locales/Model.js';
import { withAcceptLanguages } from 'server/Helpers/acceptLanguage.js';
import { render, t } from './render.js';

/** The message as it reaches the inbox. Replying answers the sender. */
export const contactMessage = ({ email, message }: { email: string; message: string }) => {
  return withAcceptLanguages([SOURCE], () => {
    const subject = t('contact_message_subject', { email: email });

    return {
      subject,
      html: render('contactMessage', { message: message, subject }),
      // For clients that don't show HTML.
      text: message,
    };
  });
};
