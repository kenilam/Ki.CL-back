import { render, t } from './render.js';

interface Props {
  /** The confirm page, with the request and its secret after `#`. */
  link: string;
  /** How long the link works. */
  minutes: number;
}

export const passwordChangeConfirm = ({ link, minutes }: Props) => {
  const subject = t('password_change_confirm_subject');

  return {
    subject,
    html: render('passwordChangeConfirm', { link, minutes, subject }),
    // For clients that don't show HTML.
    text: [
      t('password_change_confirm_asked'),
      t('password_change_confirm_open', { count: minutes, link }),
      t('password_change_confirm_ignore'),
    ].join('\n\n'),
  };
};
