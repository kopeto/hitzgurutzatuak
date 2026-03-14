const {logDate, logError} = require('../utils.js');
const checkAuth = require('../auth/authenticate.js');
const express = require('express');
const router = express.Router();
const path = require('path');

// Crossword Class
const Crossword = require('../cw/crossword.js');
// Models
const CrosswordModel = require('../models/crosswords');
const PlaySession = require('../models/playsession');
const GameStateModel = require('../models/gamestate');

const flash = require('connect-flash');

const upload = require('../config/uploadconfig');

// Helper: strip solution data before sending to client.
// clues[] is the flat DB array (always populated); w.clue is a per-word copy (only on newer uploads).
function sanitizeWords(words, clues) {
  return words.map((w, i) => ({
    dir: w.dir,
    x: w.x,
    y: w.y,
    length: w.length,
    number: w.number,
    clue: (clues && clues[i]) ? clues[i] : (w.clue || '')
    // Do NOT include w.word (the answer)
  }));
}

// Helper: build an empty user grid from void_grid template
function createEmptyGrid(void_grid) {
  return void_grid.map(row =>
    row.map(cell => (cell === '.' ? '.' : ''))
  );
}

router.get('/', async (req, res) => {
  try {
    const puzzles = await CrosswordModel.find({});

    // For logged-in users build a map puzzleId → session info
    let statusMap = {};
    if (req.user) {
      const userId = req.user._id.toString();
      const sessions = await PlaySession.find({ userId, puzzleId: { $in: puzzles.map(p => p._id.toString()) } });
      sessions.forEach(s => {
        statusMap[s.puzzleId] = {
          status:         s.completedAt ? 'completed' : 'started',
          elapsedSeconds: s.elapsedSeconds || 0,
          errorCount:     s.errorCount || 0,
          usedVerify:     s.usedVerify || false,
          usedHints:      s.usedHints || false
        };
      });
    }

    res.render('puzzles', {
      title: 'Puzleak',
      puzzles: puzzles,
      statusMap
    });
  } catch (err) {
    logError(err);
    res.render('puzzles', { title: 'Puzleak', puzzles: [], statusMap: {} });
  }
});

router.get('/upload', checkAuth, (req, res) => {
  res.render('upload', {
    title: 'Puz fitxategia kargatu',
    errors: {}
  });
});

router.post('/upload', checkAuth, upload.single('filename'), async (req, res, next) => {
  if (req.uploadErrors !== undefined) {
    req.uploadErrors.forEach((err) => {
      req.flash('danger', '\'' + err.filename + '\' ' + err.message);
    });
    return res.redirect('/puzzles');
  }

  try {
    const filePath = path.join(path.join(__dirname, '../uploads'), req.file.originalname);
    const crossword = new Crossword(filePath);
    const cw = new CrosswordModel();

    cw.filename   = req.file.originalname;
    cw.width      = crossword.width;
    cw.height     = crossword.height;
    cw.words      = crossword.words;
    cw.clues      = crossword.clues;
    cw.void_grid  = crossword.void_grid;
    cw.filled_grid = crossword.filled_grid;
    cw.name       = crossword.cw_name === 'Unknown' ? 'Izengabea' : crossword.cw_name;
    cw.author     = crossword.cw_author === 'Unknown' ? 'Joxan Elosegi' : crossword.cw_author;

    await cw.save();
    req.flash('success', 'Puzlea Kargatuta');
    res.redirect('/puzzles');
  } catch (err) {
    if (err.name === 'MongoError' && err.code === 11000) {
      logError({ message: err.name + ': Key duplicate error' });
      req.flash('danger', err.name + ': \'' + req.file.filename + '\' errepikatuta dago.');
    } else {
      logError(err);
      req.flash('danger', 'Erroreren bat izan da');
    }
    res.redirect('/puzzles');
  }
});

router.get('/game/:id', async (req, res) => {
  try {
    const puzzle = await CrosswordModel.findById(req.params.id);
    if (!puzzle) {
      req.flash('danger', 'Puzlea ez da aurkitu.');
      return res.redirect('/puzzles');
    }

    // Load persisted state for authenticated users
    let savedElapsed = 0;
    let savedUsedVerify = false;
    let isCompleted = false;
    let savedCellResults = null;
    if (req.user) {
      const savedState = await GameStateModel.findOne({
        playerId: req.user._id.toString(),
        puzzleId: puzzle._id.toString()
      });
      if (savedState) {
        savedElapsed = savedState.elapsedSeconds || 0;
        savedUsedVerify = savedState.usedVerify || false;
        isCompleted = savedState.completed || false;
        if (savedState.cellResults && savedState.cellResults.length > 0) {
          savedCellResults = savedState.cellResults;
        }
      }
    }

    // Store solution in session — never sent to client
    req.session.currentGame = {
      puzzleId:       puzzle._id.toString(),
      startedAt:      new Date(),
      userGrid:       createEmptyGrid(puzzle.void_grid),
      checkCount:     0,
      hintCount:      0,
      elapsedSeconds: savedElapsed,
      timerStartedAt: isCompleted ? null : new Date(),
      errorCount:     0,
      usedVerify:     savedUsedVerify
    };

    // Record play start for logged-in users (only if not already completed)
    if (req.user && !isCompleted) {
      await PlaySession.findOneAndUpdate(
        { userId: req.user._id.toString(), puzzleId: puzzle._id.toString() },
        { $set: { startedAt: new Date() } },
        { upsert: true, new: true }
      );
    }

    // Send sanitized puzzle to view (no filled_grid, no word answers)
    res.render('game', {
      title: 'JOKOA',
      puz: {
        id:             puzzle._id.toString(),
        name:           puzzle.name,
        author:         puzzle.author,
        width:          puzzle.width,
        height:         puzzle.height,
        void_grid:      puzzle.void_grid,
        words:          sanitizeWords(puzzle.words, puzzle.clues),
        completed:      isCompleted,
        elapsedSeconds: savedElapsed,
        cellResults:    savedCellResults
      }
    });
  } catch (err) {
    logError(err);
    req.flash('danger', 'Erroreren bat gertatu da.');
    res.redirect('/puzzles');
  }
});

router.delete('/game/:id', checkAuth, async (req, res) => {
  try {
    await CrosswordModel.deleteOne({ _id: req.params.id });
    req.flash('success', 'Jokoa ezabatu dugu');
    res.end();
  } catch (err) {
    logError(err);
    req.flash('danger', 'Erroreren bat izan da');
    res.end();
  }
});

module.exports = router;
