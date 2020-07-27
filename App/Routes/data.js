import { emptyRoute } from '^/App/Utilities';
import { Behance, EBay, Napster } from '^/App/API';
import { instance } from '^/App/Server';

const { projects, project, user } = Behance;
const { search, track } = Napster;

const data = () => {
  instance.get('/api/about', async (req, res) => {
    const { result, http_code } = await user();

    res.status(http_code).send(result);
  });

  instance.get('/api/works', async (req, res) => {
    const { result, http_code } = await projects();

    console.log('/api/works');

    res.status(http_code).send(result);
  });

  instance.get('/api/works/:projectId', async (req, res) => {
    const { projectId } = req.params;
    const { result, http_code } = await project(projectId);

    res.status(http_code).send(result);
  });
  
  instance.get('/api/musics', emptyRoute);
  
  instance.get('/api/musics/:query', async (req, res) => {
    const { query } = req.params;
    const { result, http_code } = await search(query);
  
    res.status(http_code).send(result);
  });
  
  instance.get('/api/musics/:query/:id', async (req, res) => {
    const { query, id } = req.params;
    const { result, http_code } = await search(query, id);
    
    res.status(http_code).send(result);
  });

  instance.get('/api/ebay', async (req, res) => {
    console.log(new URL(req.url.replace('/api/ebay?url=', '')));
    const { query: { url, callbackname, ...params } } = req;
    const { origin, pathname, searchParams } = new URL(url);

    const query = Object.keys(params).map(key => key + '=' + params[key]).join('&');

    const { result, http_code } = await EBay({ callbackname, url: `${origin}${pathname}?${searchParams.toString()}&${query}` });

    res.status(http_code).send(result);
  });
};

export default data;
