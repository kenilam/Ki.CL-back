import { render } from './render.js';

const subject = 'Your message was received';

/**
 * The acknowledgement. It does not repeat the message: the address is
 * whatever was typed into the form, so it may not be the sender's.
 */
export const contactReceived = () => ({
  subject,
  html: render('contactReceived', { subject }),
  // For clients that don't show HTML.
  text: [
    'Thank you for writing to Ki.CL. The message has arrived and a reply will come to this address.',
    'This mailbox is not read. If you did not write, ignore this email.',
  ].join(' '),
});
