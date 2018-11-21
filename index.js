import App from '^/App';

class Backend {
  constructor () {
    this.create = this.create.bind(this);

    this.create();
  }

  handleError (res, reason, message, code) {
    console.log(`ERROR: ${reason}`);
    res.status(code || 500).json({'error': message});
  }

  async create () {
    this.app = new App();

    const backend = await this.app.create();

    if (App.env === 'production') {
      return;
    }

    const { port } = backend.address();
    // const url = `${backend.domain || 'http://localhost'}:${port}`;

    console.log(`Backend is now running on port ${port}`);
  }
}

export default new Backend();
