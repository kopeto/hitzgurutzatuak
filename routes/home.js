const express = require('express');
const router = express.Router();

const CrosswordModel = require('../models/crosswords');
const { logError } = require('../utils');
const { renderReact, serializePuzzleSummary } = require('../services/react-view');

router.get('/', async (req, res) => {
  try {
    const puzzles = await CrosswordModel
      .find({})
      .sort({ createdAt: -1 })
      .limit(6)
      .lean();

    return renderReact(res, 'home', { puzzles: puzzles.map(serializePuzzleSummary) }, { title: res.locals.t('page.home') });
  } catch (error) {
    logError(error);
    return renderReact(res, 'message', { message: 'Ezin izan dira puzleak eskuratu.', type: 'danger' }, { status: 500 });
  }
});

module.exports = router;
