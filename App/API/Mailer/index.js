import Core from '^/App/API/Mailer/Core';
import Send from './Send';
import {emailValidate} from './Utilities';

const VALIDATE_STATUS = {
    error: { code: 401, error: true, result: 'All required Fields are missing' },
    invalid: { code: 401, error: true, result: 'Email is invalid' },
    partial: { code: 401, error: true, result: 'Some required fields are missing' },
    success: { code: 200, result: 'Email sent successfully' }
}

const Mailer = async ({ email, message, name }) => {
    try {
        let error = null;

        if (!email && !message && !name) {
            error = VALIDATE_STATUS.error;
        }

        else if (!email || !message || !name) {
            error = VALIDATE_STATUS.partial;
        }

        else if (!emailValidate(email)) {
            error = VALIDATE_STATUS.invalid;
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
        return Promise.resolve({ code: 400, error: true, result: errors });
    }
}

export default Mailer;
