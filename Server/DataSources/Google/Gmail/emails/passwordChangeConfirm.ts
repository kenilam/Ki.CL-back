import { render } from './render.js';

interface Props {
  /** The confirm page, with the request and its secret after `#`. */
  link: string;
}

const subject = 'Confirm your password change';

export const passwordChangeConfirm = ({ link }: Props) => ({
  subject,
  html: render('passwordChangeConfirm', { link, subject }),
  // For clients that don't show HTML.
  text: [
    'Someone signed in to your Ki.CL account asked to change its password.',
    `Open this link within 10 minutes to confirm it:\n${link}`,
    'If this was not you, ignore this email. Your password stays the same.',
  ].join('\n\n'),
});
