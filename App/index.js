import Routes from './Routes';
import Server from './Server';

class App {
  constructor () {
    Routes.create();
    Server.start();
  }
}

export default App;
