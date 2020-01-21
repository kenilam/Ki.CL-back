import Core from '^/App/API/Mailer/Core';
import Send from './Send';
import {emailValidate, messageValidate} from './Utilities';

const VALIDATE_STATUS = {
    error: { http_code: 401, error: true, result: 'All required Fields are missing' },
    partial: { http_code: 401, error: true, result: 'Some required fields are missing' },
    success: { http_code: 200, result: 'Email sent successfully' },
    invalid: {
        email: { http_code: 401, error: true, result: 'Email address is invalid' },
        message: { http_code: 401, error: true, result: 'Message is invalid' }
    }
}

const Mailer = async ({ email, message, name }) => {
    try {
        let error = null;

        const config = await Core.config();

        if (!email && !message && !name) {
            error = VALIDATE_STATUS.error;
        }

        else if (!email || !message || !name) {
            error = VALIDATE_STATUS.partial;
        }

        else if (!emailValidate(email)) {
            error = VALIDATE_STATUS.invalid.email;
        }

        else if (!messageValidate(message, config.message.maxLength, config.message.minLength)) {
            error = VALIDATE_STATUS.invalid.message;
        }

        if (error) {
            return Promise.resolve(error);
        }
        
        const { user: owner } = await Core.auth();
        const { user: recipient } = await Core.recipient();

        const conformation = {
            from: owner,
            message,
            subject: 'Thank you for your email!',
            template: 'confirmation',
            to: email
        };

        const notification = {
            from: owner,
            message,
            subject: 'You got a email!',
            template: 'notification',
            to: recipient
        };

        return Send([ conformation, notification ]).then(() => VALIDATE_STATUS.success);
    } catch (errors) {
        return Promise.resolve({ http_code: 400, error: true, result: errors });
    }
}

const Config = async () => {
    const result = await Core.config();

    return Promise.resolve({ http_code: 200, result });
}

export { Config };
export default Mailer;
