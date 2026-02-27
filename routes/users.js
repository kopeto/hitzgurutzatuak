const {logDate, logError} = require('../utils.js');

const { check, validationResult,body } = require('express-validator');

const express = require('express');
const router = express.Router();
const path = require('path');
const bcrypt = require('bcryptjs');
const passport = require('passport');
require('dotenv/config');

// Models
const UserModel = require('../models/user');

router.get('/register',(req,res)=>{
  res.render('register');
});


// Register proccess
router.post('/register',[
  check('email','Posta elektronikoa beharrezkoa da').notEmpty(),
  check('email','Posta elektronikoa ez da zuzena').isEmail(),
  check('username','Erabiltzailea beharrezkoa da').notEmpty(),
  check('password','Pasahitza beharrezkoa da').notEmpty(),
  check('password2','Pasahitzarean egiaztapena beharrezkoa da').notEmpty()

],async (req,res)=>{
  if(req.body.password){
    await body('password2')
      .equals(req.body.password)
      .withMessage('Pasahitza eta egiaztapena ez dira berdinak')
      .run(req);
  }

  const errors = validationResult(req);
  if(!errors.isEmpty()){
    res.render('register',errors);
  } else {

    try {
      const salt = await bcrypt.genSalt(10);
      const hash = await bcrypt.hash(req.body.password, salt);

      const newUser = new UserModel({
        email:    req.body.email,
        username: req.body.username,
        password: hash,
        master:   process.env.MASTERS.split(' ').includes(req.body.username)
      });

      await newUser.save();
      req.flash('success', 'Erabiltzaile berria sortu duzu');
      res.redirect('/users/login');
    } catch (err) {
      logError(err);
      req.flash('danger', 'Erroreren bat izan da');
      res.redirect('/users/register');
    }
  }
});


// Login form
router.get('/login', (req,res)=>{
  res.render('login');
});

// Login proccess
router.post('/login', (req,res,next)=>{
  passport.authenticate('local', {
    successRedirect: '/',
    failureRedirect: '/users/login',
    failureFlash: 'Erabiltzaile edo pasahitz okerra',
    successFlash:true
  })(req,res,next);
});

// Logout
router.get('/logout',(req,res,next)=>{
  req.logout((err) => {
    if (err) return next(err);
    req.flash('success', 'Saioa itxi duzu.');
    res.redirect('/');
  });
});

module.exports = router;
