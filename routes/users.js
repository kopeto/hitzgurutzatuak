const {logError} = require('../utils.js');
const { body, validationResult } = require('express-validator');

const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const passport = require('passport');

// Models
const UserModel = require('../models/user');
const PlaySession = require('../models/playsession');
const CrosswordModel = require('../models/crosswords');

router.get('/register',(req,res)=>{
  res.render('register');
});

router.post('/register',[
  body('email')
    .trim()
    .notEmpty().withMessage('Posta elektronikoa beharrezkoa da.')
    .isEmail().withMessage('Posta elektronikoa ez da zuzena.')
    .normalizeEmail(),
  body('username')
    .trim()
    .isLength({ min: 3, max: 40 }).withMessage('Erabiltzaileak 3 eta 40 karaktere artean izan behar ditu.')
    .matches(/^[\p{L}\p{N}._-]+$/u).withMessage('Erabiltzaileak letrak, zenbakiak, puntuak, marratxoak edo azpimarrak soilik izan ditzake.'),
  body('password')
    .isLength({ min: 4 }).withMessage('Pasahitzak gutxienez 4 karaktere izan behar ditu.'),
  body('password2')
    .notEmpty().withMessage('Pasahitzaren egiaztapena beharrezkoa da.')
    .custom((value, { req }) => value === req.body.password)
    .withMessage('Pasahitza eta egiaztapena ez dira berdinak.')
], async (req,res)=>{
  const errors = validationResult(req);
  if(!errors.isEmpty()){
    res.status(422).render('register', { errors: errors.array() });
  } else {
    try {
      const salt = await bcrypt.genSalt(10);
      const hash = await bcrypt.hash(req.body.password, salt);

      const newUser = new UserModel({
        email:    req.body.email,
        username: req.body.username.trim().toLowerCase(),
        password: hash,
        master: false
      });

      await newUser.save();
      req.flash('success', 'Erabiltzaile berria sortu duzu');
      res.redirect('/users/login');
    } catch (err) {
      if (err && err.code === 11000) {
        req.flash('danger', 'Erabiltzailea edo posta elektronikoa dagoeneko erregistratuta dago.');
      } else {
        logError(err);
        req.flash('danger', 'Ezin izan da erabiltzailea sortu.');
      }
      res.redirect('/users/register');
    }
  }
});


router.get('/login', (req,res)=>{
  res.render('login');
});

router.post('/login', (req,res,next)=>{
  passport.authenticate('local', (error, user, info) => {
    if (error) return next(error);
    if (!user) {
      req.flash('danger', info?.message || 'Erabiltzailea edo pasahitza okerra da.');
      return res.redirect('/users/login');
    }

    return req.session.regenerate(regenerateError => {
      if (regenerateError) return next(regenerateError);

      return req.logIn(user, loginError => {
        if (loginError) return next(loginError);
        req.flash('success', info?.message || `Ongi etorri, ${user.username}!`);
        return res.redirect('/');
      });
    });
  })(req,res,next);
});

router.get('/logout',(req,res,next)=>{
  try {
    req.logout();
  } catch (err) {
    return next(err);
  }

  return req.session.destroy(err => {
    if (err) return next(err);
    res.clearCookie('hitzgurutzatuak.sid');
    res.redirect('/');
  });
});

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
        durationSeconds: s.elapsedSeconds || (s.completedAt
          ? Math.max(0, Math.round((new Date(s.completedAt) - new Date(s.startedAt)) / 1000))
          : null
        )
      }));

    const inProgress = sessions
      .filter(s => !s.completedAt)
      .sort((a, b) => new Date(b.startedAt) - new Date(a.startedAt))
      .map(s => ({ ...s, puzzle: puzzleMap[s.puzzleId] || null }));

    res.render('dashboard', {
      title: res.locals.t('page.dashboard'),
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
