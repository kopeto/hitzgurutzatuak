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
const PlaySession = require('../models/playsession');
const CrosswordModel = require('../models/crosswords');

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
  req.logout();
  req.session.regenerate((err) => {
    if (err) return next(err);
    res.redirect('/');
  });
});

// User dashboard
router.get('/dashboard', async (req, res) => {
  if (!req.isAuthenticated()) return res.redirect('/users/login');
  try {
    const sessions = await PlaySession.find({ userId: req.user._id.toString() }).lean();
    const puzzleIds = sessions.map(s => s.puzzleId);
    const puzzles = await CrosswordModel.find({ _id: { $in: puzzleIds } }).lean();
    const puzzleMap = {};
    puzzles.forEach(p => { puzzleMap[p._id.toString()] = p; });

    const completed  = sessions
      .filter(s => s.completedAt)
      .sort((a, b) => new Date(b.completedAt) - new Date(a.completedAt))
      .map(s => ({
        ...s,
        puzzle: puzzleMap[s.puzzleId] || null,
        durationMin: s.completedAt
          ? Math.round((new Date(s.completedAt) - new Date(s.startedAt)) / 60000)
          : null
      }));

    const inProgress = sessions
      .filter(s => !s.completedAt)
      .sort((a, b) => new Date(b.startedAt) - new Date(a.startedAt))
      .map(s => ({ ...s, puzzle: puzzleMap[s.puzzleId] || null }));

    res.render('dashboard', {
      title: 'Nire panela',
      stats: {
        completed:  completed.length,
        inProgress: inProgress.length,
        total:      sessions.length
      },
      completed,
      inProgress
    });
  } catch (err) {
    logError(err);
    res.status(500).render('message', { message: 'Errore bat gertatu da', type: 'danger' });
  }
});

module.exports = router;
