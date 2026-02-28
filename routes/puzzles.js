const {logDate, logError} = require('../utils.js');
const checkAuth = require('../auth/authenticate.js');
const express = require('express');
const router = express.Router();
const path = require('path');

// Crossword Class
const Crossword = require('../cw/crossword.js');
// Models
const CrosswordModel = require('../models/crosswords');

const flash = require('connect-flash');

const upload = require('../config/uploadconfig');

// Helper: strip solution data before sending to client
function sanitizeWords(words) {
  return words.map(w => ({
    dir: w.dir,
    x: w.x,
    y: w.y,
    length: w.length,
    number: w.number
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
    res.render('puzzles', {
      title: 'Puzleak',
      puzzles: puzzles
    });
  } catch (err) {
    logError(err);
    res.render('puzzles', { title: 'Puzleak', puzzles: [] });
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
    cw.name       = crossword.cw_name === 'Unknown' ? 'noname' : crossword.cw_name;
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

    // Store solution in session — never sent to client
    req.session.currentGame = {
      puzzleId:   puzzle._id.toString(),
      startedAt:  new Date(),
      userGrid:   createEmptyGrid(puzzle.void_grid),
      checkCount: 0,
      hintCount:  0
    };

    // Send sanitized puzzle to view (no filled_grid, no word answers)
    res.render('game', {
      title: 'JOKOA',
      puz: {
        name:      puzzle.name,
        author:    puzzle.author,
        width:     puzzle.width,
        height:    puzzle.height,
        void_grid: puzzle.void_grid,
        words:     sanitizeWords(puzzle.words),
        clues:     puzzle.clues
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
