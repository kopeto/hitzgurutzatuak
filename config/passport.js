const LocalStrategy = require('passport-local').Strategy;
const UserModel = require('../models/user');
const config = require('../config/database');
const bcrypt = require('bcryptjs');
const {logDate, logError, logInfo} = require('../utils.js');
require('dotenv/config');


module.exports = (passport)=>{
  // Local strategy
  passport.use(new LocalStrategy((username, password, done)=>{
    // Match username
    let query = {username:username};
    UserModel.findOne(query, (err,user)=>{
      if(err) throw err;
      if(!user){
        return done(null, false, {message: 'No user found'});
      }
      //Match Password
      bcrypt.compare(password, user.password, (err, isMatch)=>{
        if(err) throw err;
        if(isMatch){
          logInfo('User \''+username+'\' logged in.');
          //user.master=process.env.MASTERS.split(' ').includes(username);
          console.log(user);
          return done(null,user, {message: 'Ongi etorri '+username+'!'});
        }else{
          return done(null, false, {message: 'Wrong password'});
        }
      });
    });
  }));

  passport.serializeUser((user, done)=>{
    done(null, user.id);
  });

  passport.deserializeUser((id, done)=> {
    UserModel.findById(id, (err, user)=> {
      done(err, user);
    });
  });

}
