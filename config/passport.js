const LocalStrategy = require('passport-local').Strategy;
const UserModel = require('../models/user');
const config = require('../config/database');
const bcrypt = require('bcryptjs');
const {logDate, logError, logInfo} = require('../utils.js');
require('dotenv/config');


module.exports = (passport)=>{
  // Local strategy — async/await, no callbacks (Mongoose 9)
  passport.use(new LocalStrategy(async (username, password, done)=>{
    try {
      const user = await UserModel.findOne({ username });
      if (!user) {
        return done(null, false, { message: 'Ez da erabiltzailerik aurkitu' });
      }
      const isMatch = await bcrypt.compare(password, user.password);
      if (isMatch) {
        logInfo('User \'' + username + '\' logged in.');
        return done(null, user, { message: 'Ongi etorri ' + username + '!' });
      } else {
        return done(null, false, { message: 'Pasahitz okerra' });
      }
    } catch (err) {
      return done(err);
    }
  }));

  passport.serializeUser((user, done)=>{
    done(null, user.id);
  });

  passport.deserializeUser(async (id, done)=> {
    try {
      const user = await UserModel.findById(id);
      done(null, user);
    } catch (err) {
      done(err);
    }
  });

}
