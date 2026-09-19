const express = require('express');
const router = express.Router();

const CrosswordModel = require('../models/crosswords');
const { logError } = require('../utils');

router.get('/', async (req, res) => {
  try {
    const puzzles = await CrosswordModel
      .find({})
      .sort({ createdAt: -1 })
      .limit(6)
      .lean();

    return res.render('home', {
      title: res.locals.t('page.home'),
      puzzles
    });
  } catch (error) {
    logError(error);
    return res.status(500).render('message', {
      message: 'Ezin izan dira puzleak eskuratu.',
      type: 'danger'
    });
  }
});

module.exports = router;
