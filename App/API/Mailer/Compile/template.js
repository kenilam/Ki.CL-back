import pug from 'pug';

const compiler = (file, props) => pug.renderFile(file, props);

export default { compiler };
