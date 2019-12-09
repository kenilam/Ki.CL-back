import nodemailer from 'nodemailer';

import { env } from '^/App/Utilities';

import Core from '^/App/API/Mailer/Core';
import Compile from '^/App/API/Mailer/Compile';

const debug = env === 'development';

const Send = async (emails) => {
    try {
        const auth = await Core.auth();
        const host = await Core.host();
        const port = await Core.port();

        const transport = nodemailer.createTransport(
            { auth, debug, host, port, logger: debug }
        );

        const eachEmail = async ({ from, message, subject, template, to }) => {
            const css = await Compile.style.compiler(template);

            console.log(css);

            return await new Promise(
                (resolve, reject) => {
                    transport.sendMail(
                        { from, html: message, subject, text: message, to },
                        ( error, info ) => {
                            if (error) {
                                reject(error);
                                return;
                            }

                            resolve(info);
                        }
                    )
                }
            )
        };

        return Promise.all( emails.map(eachEmail) );
    } catch (errors) {
        throw new Error(errors);
    }
};

export default Send;
