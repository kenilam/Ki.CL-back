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

    const app = await this.app.create();

    console.log(`Backend is now running on port ${app.address().port}`);
  }
}

export default new Backend();
