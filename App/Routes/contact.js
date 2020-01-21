import { emptyRoute } from '^/App/Utilities';
import { instance } from '^/App/Server';
import { Mailer, MailerConfig } from '^/App/API';

const contact = () => {
  instance.post('/api/contact', async (req, res) => {
    try {
        const responses = await Mailer(req.body);
        const { http_code, error, result } = responses;
        
        res.status(http_code).send({error, result});
    } catch (errors) {
        res.status(400).send('Bad Request');
    }
  });

  instance.get('/api/contact/config', async (req, res) => {
    try {
        const responses = await MailerConfig();
        const { http_code, result } = responses;
        
        res.status(http_code).send(result);
    } catch (errors) {
        res.status(400).send('Bad Request');
    }
  });
};

export default contact;
