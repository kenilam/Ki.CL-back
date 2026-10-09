import nodemailer, { type Transporter } from 'nodemailer';
import { Unavailable } from 'server/Errors/index.js';

interface Mail {
  to: string;
  /** Where a reply goes, when that is not the sender. */
  replyTo?: string;
  subject: string;
  text: string;
  html?: string;
}

let transport: Transporter | null = null;

/**
 * Sends an email from the Workspace account in `MAILER_USER`.
 * Gmail only accepts an app password here, not the account's own.
 *
 * Without an account, development prints the message to the console so a link
 * in it can still be followed. Anywhere else it fails, so nobody waits for an
 * email that was never sent.
 */
export async function send(mail: Mail): Promise<void> {
  const { MAILER_FROM, MAILER_PASSWORD, MAILER_SERVICE, MAILER_USER } = process.env;

  if (!MAILER_SERVICE || !MAILER_USER || !MAILER_PASSWORD) {
    if (process.env.NODE_ENV === 'development') {
      console.info(`[mailer] To: ${mail.to}${mail.replyTo ? `\nReply-To: ${mail.replyTo}` : ''}\nSubject: ${mail.subject}\n\n${mail.text}`);
      return;
    }

    throw Unavailable('Email is not available. Try again later.');
  }

  transport ??= nodemailer.createTransport({
    service: MAILER_SERVICE,
    auth: { user: MAILER_USER, pass: MAILER_PASSWORD },
  });

  // An address the account may send as, such as a no-reply alias. Otherwise the account itself.
  await transport.sendMail({ ...mail, from: MAILER_FROM || MAILER_USER });
}
