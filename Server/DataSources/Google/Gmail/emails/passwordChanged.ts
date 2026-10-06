import { render } from './render.js';

const subject = 'Your password was changed';

/** Sent from a no-reply address, so it names one that is read when there is one. */
export const passwordChanged = () => {
  const contact = process.env.MAILER_CONTACT;

  return {
    subject,
    html: render('passwordChanged', { contact, subject }),
    // For clients that don't show HTML.
    text: [
      'The password of your Ki.CL account was just changed.',
      contact ? `If this was not you, write to ${contact}.` : '',
    ].join(' ').trim(),
  };
};
