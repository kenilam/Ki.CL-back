import juice from 'juice';
import sass from 'node-sass';

const inliner = (template, css) => juice(`<style>${css}</style>${template}`);

const compiler = async template => {
    try {
        const result = await sass.renderSync({ file: `App/API/Mailer/Template/${template}.scss` });

        return result;
    } catch (errors) {
        throw new Error(errors);
    }
}

export default { compiler, inliner };
