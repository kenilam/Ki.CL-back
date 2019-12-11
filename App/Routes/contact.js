import { emptyRoute } from '^/App/Utilities';
import { instance } from '^/App/Server';
import { Mailer } from '^/App/API';

const contact = () => {
  instance.post('/api/contact', async (req, res) => {
    try {
        const responses = await Mailer(req.body);
        const { code } = responses;
        
        res.status(code).send(responses);
    } catch (errors) {
        res.status(400).send('Bad Request');
    }
  });
};

export default contact;
