import { render, t } from './render.js';

/** The message as it reaches the inbox. Replying answers the sender. */
export const contactMessage = ({ Email, Message }: { Email: string; Message: string }) => {
  const subject = t('contact_message_subject', { email: Email });

  return {
    subject,
    html: render('contactMessage', { message: Message, subject }),
    // For clients that don't show HTML.
    text: Message,
  };
};
