import { render, t } from './render.js';

/**
 * The acknowledgement. It does not repeat the message: the address is
 * whatever was typed into the form, so it may not be the sender's.
 */
export const contactReceived = () => {
  const subject = t('contact_received_subject');

  return {
    subject,
    html: render('contactReceived', { subject }),
    // For clients that don't show HTML.
    text: [t('contact_received_thanks'), t('contact_received_unread')].join(' '),
  };
};
