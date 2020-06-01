import Core from '^/App/API/Mailer/Core';
import Send from './Send';
import {emailValidate, messageValidate} from './Utilities';

const VALIDATE_STATUS = {
    error: { http_code: 401, error: true, message: 'All required Fields are missing' },
    partial: { http_code: 401, error: true, message: 'Some required fields are missing' },
    success: { http_code: 200, success: true, message: 'Email sent successfully' },
    invalid: {
        email: { http_code: 401, error: true, message: 'Email address is invalid' },
        message: { http_code: 401, error: true, message: 'Message is invalid' },
        robot: { http_code: 401, error: true, message: 'I don\'t talk to robot' },
    }
}

const Mailer = async ({ email, id, message, name }) => {
    try {
        const config = await Core.config();

        if (!email && !message && !name) {
            return Promise.resolve(VALIDATE_STATUS.error);
        }

        if (!email || !message || !name) {
            return Promise.resolve(VALIDATE_STATUS.partial);
        }

        if (!emailValidate(email)) {
            return Promise.resolve(VALIDATE_STATUS.invalid.email);
        }

        if (!messageValidate(message, config.message.maxLength, config.message.minLength)) {
            return Promise.resolve(VALIDATE_STATUS.invalid.message);
        }

        if (id) {
            return Promise.resolve(VALIDATE_STATUS.invalid.robot);
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
        return Promise.resolve(errors);
    }
}

const Config = async () => {
    const result = await Core.config();

    return Promise.resolve({ http_code: 200, result });
}

export { Config };
export default Mailer;
