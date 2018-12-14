import passport from 'passport';
import { OAuth2Strategy, userProfile } from 'passport-pinterest-oauth';
import PDK from 'node-pinterest';

import { instance } from '^/App/Server';

const oauth = new OAuth2Strategy(
  {
    clientID: 4982544597935733434,
    clientSecret: '1bcc7b7f5b92e4ef970e36ced9d6c143208b834b941d8dc63bbc5356ef418e67',
    callbackURL: 'http://localhost:3100/auth/pinterest/callback'
  },
  ( accessToken, refreshToken, profile, done ) => userProfile(accessToken, done)
)

passport.use( oauth );

const Pinterest = () => {
  instance.get('/auth/pinterest/callback', 
    passport.authenticate('pinterest', { scope: [
      'read_pubic'
    ] }),
    function(req, res) {
      // Successful authentication, redirect home.
      res.redirect('/');
    }
  );
}

export default Pinterest;
