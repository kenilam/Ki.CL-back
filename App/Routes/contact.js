import { emptyRoute } from '^/App/Utilities';
import { instance } from '^/App/Server';
import { Mailer } from '^/App/API';

const contact = () => {
  instance.get('/api/contact', async (req, res) => {
    try {
        const { email, message, name } = req.query;
        const results = await Mailer(email, message, name);

        const errors = results.filter(
            ({ response }) => response.startsWith('205')
        );

        let http_code = '204';

        if (errors.length !== results.length) {
            http_code = '207';
        }

        if (errors.length === results.length) {
            http_code = '400';
        }
        
        res.status(http_code).send(results);
    } catch (errors) {
        throw new Error(errors);
    }
  });
};

export default contact;
