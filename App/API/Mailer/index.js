import Core from '^/App/API/Mailer/Core';
import Send from './Send';

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

        return Send([ conformation, notification ]);
    } catch (errors) {
        throw new Error(errors);
    }
}

export default Mailer;
