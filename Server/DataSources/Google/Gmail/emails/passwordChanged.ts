import { render, t } from './render.js';

/** Sent from a no-reply address, so it names one that is read when there is one. */
export const passwordChanged = () => {
  const contact = process.env.MAILER_CONTACT;
  const subject = t('password_changed_subject');

  return {
    subject,
    html: render('passwordChanged', { contact, subject }),
    // For clients that don't show HTML.
    text: [
      t('password_changed_notice'),
      contact ? t('password_changed_contact', { contact }) : '',
    ].join(' ').trim(),
  };
};
