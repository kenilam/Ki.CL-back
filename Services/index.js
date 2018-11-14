class Services {
  static get COLLECTION () {
    return 'behance';
  }

  static get URI () {
    return 'http://behance.net/v2/users/kicl?api_key=';
  }

  constructor (database) {
    this.database = database;
  }

  api_key () {
    return new Promise((resolve) => {
      this.database.collection(Services.COLLECTION).find({ '_id': 'api_key' }).toArray((error, doc) => {
        resolve(doc[0].value);
      });
    })
  }

  async profile () {
    const api_key = await this.api_key();

    console.log(api_key);
  }
}

export default Services;