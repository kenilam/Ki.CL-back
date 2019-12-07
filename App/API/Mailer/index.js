import nodemailer from 'nodemailer';

import Core from '^/App/API/Mailer/Core';
import { env } from '^/App/Utilities';

const debug = env === 'development';

const sender = async (emails) => {
    try {
        const auth = await Core.auth();
        const host = await Core.host();
        const port = await Core.port();

        const transport = nodemailer.createTransport(
            { auth, debug, host, port, logger: debug }
        );

        const eachEmail = ({ from, message, subject, to }) => new Promise(
            (resolve, reject) => {
                transport.sendMail(
                    { from, html: message, subject, to },
                    ( error, info ) => {
                        if (error) {
                            reject(error);
                            return;
                        }

                        resolve(info);
                    }
                )
            }
        );

        return Promise.all( emails.map(eachEmail) );
    } catch (errors) {
        throw new Error(errors);
    }
};

const Mailer = async (email, message, name) => {
    try {
        const errors = {
            email: !email,
            message: !message,
            name: !name
        };

        if (errors.email || errors.message || errors.name) {
            throw new Error('Required Fields are missing');
        }

        const { user: owner } = await Core.auth();
        const { user: recipient } = await Core.recipient();

        return sender([
            {
                from: owner,
                message,
                subject: 'You got a email!',
                to: recipient
            },
            {
                from: owner,
                message,
                subject: 'Thank you for reaching out',
                to: email
            }
        ]);
    } catch (errors) {
        throw new Error(errors);
    }
}

export default Mailer;
