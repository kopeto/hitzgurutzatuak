const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');
const CrosswordModel = require('../models/crosswords');
const GameStateModel = require('../models/gamestate');
const PlaySession = require('../models/playsession');
const {logError, logInfo} = require('../utils.js');

// Returns a stable player identifier: userId if logged in, sessionId if anon
function getPlayerId(req) {
  return req.user ? req.user._id.toString() : 'anon_' + req.session.id;
}

// ---------------------------------------------------------------------------
// RATE LIMITERS
// ---------------------------------------------------------------------------

// Max 10 game starts per IP per minute
const startLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: true, message: 'Eskaera gehiegi. Saiatu berriro minutu batzuen buruan.' }
});

// Max 600 actions (check/solve) per IP per minute
const actionLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 600,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: true, message: 'Eskaera gehiegi. Saiatu berriro minutu baten buruan.' }
});

// ---------------------------------------------------------------------------

// Middleware to verify user has an active game session
const requireGameSession = (req, res, next) => {
  if (!req.session.currentGame) {
    return res.status(400).json({
      error: true,
      message: 'Ez dago joko aktiborik saioan' // No active game in session
    });
  }
  next();
};

/**
 * POST /api/game/start/:id
 * Starts a new game session
 */
router.post('/start/:id', startLimiter, async (req, res) => {
  try {
    const puzzle = await CrosswordModel.findById(req.params.id);
    
    if (!puzzle) {
      return res.status(404).json({
        error: true,
        message: 'Puzlea ez da aurkitu'
      });
    }

    // Create game state in session
    req.session.currentGame = {
      puzzleId: puzzle._id.toString(),
      startedAt: new Date(),
      userGrid: createEmptyGrid(puzzle.void_grid),
      checkCount: 0,
      hintCount: 0
    };

    // Send only public data to client
    res.json({
      success: true,
      game: {
        id: puzzle._id,
        name: puzzle.name,
        author: puzzle.author,
        width: puzzle.width,
        height: puzzle.height,
        void_grid: puzzle.void_grid,  // Only black cells
        words: sanitizeWords(puzzle.words), // Without answers
        clues: puzzle.clues
      }
    });

    logInfo(`User ${req.user?.username || 'anon'} started game: ${puzzle.name}`);

  } catch (err) {
    logError(err);
    res.status(500).json({
      error: true,
      message: 'Errorea jokoa hastean'
    });
  }
});

/**
 * POST /api/game/check-cell
 * Zelula bat egiaztatzen du
 */
router.post('/check-cell', actionLimiter, requireGameSession, async (req, res) => {
  try {
    const { row, col, value } = req.body;

    if (row === undefined || col === undefined || !value) {
      return res.status(400).json({
        error: true,
        message: 'Datu osatugabeak'
      });
    }

    const puzzle = await CrosswordModel.findById(req.session.currentGame.puzzleId);
    
    if (!puzzle) {
      return res.status(404).json({
        error: true,
        message: 'Puzlea ez da aurkitu'
      });
    }

    const correctValue = puzzle.filled_grid[row][col];
    const userValue = value.toUpperCase().trim();
    const correctValueUpper = correctValue.toUpperCase().trim();
    const isCorrect = userValue === correctValueUpper;

    // Update user grid if correct
    if (isCorrect) {
      req.session.currentGame.userGrid[row][col] = userValue;
    }

    req.session.currentGame.checkCount++;

    res.json({
      success: true,
      correct: isCorrect,
      // Ez bidali erantzun zuzena
    });

  } catch (err) {
    logError(err);
    res.status(500).json({
      error: true,
      message: 'Errorea zelula egiaztatzean'
    });
  }
});

/**
 * POST /api/game/check-word
 * Hitz osoa egiaztatzen du — bezero DOM-etik zelula balioak jasotzen ditu
 */
router.post('/check-word', actionLimiter, requireGameSession, async (req, res) => {
  try {
    const { wordDir, wordX, wordY, cells } = req.body;

    if (wordDir === undefined || wordX === undefined || wordY === undefined || !Array.isArray(cells)) {
      return res.status(400).json({
        error: true,
        message: 'Datu osatugabeak'
      });
    }

    const puzzle = await CrosswordModel.findById(req.session.currentGame.puzzleId);
    if (!puzzle) {
      return res.status(404).json({ error: true, message: 'Puzlea ez da aurkitu' });
    }

    const wordIndex = puzzle.words.findIndex(
      w => w.dir === wordDir && w.x === wordX && w.y === wordY
    );
    if (wordIndex === -1) {
      return res.status(404).json({
        error: true,
        message: 'Hitza ez da aurkitu'
      });
    }

    let allCorrect = true;
    const cellResults = cells.map(({ row, col, value }) => {
      const correct = puzzle.filled_grid[row][col].toUpperCase() === (value || '').toUpperCase();
      if (!correct) allCorrect = false;

      // Update session userGrid only for correct cells
      if (correct) {
        req.session.currentGame.userGrid[row][col] = puzzle.filled_grid[row][col];
      }

      return { row, col, correct };
    });

    req.session.currentGame.checkCount++;

    res.json({
      success: true,
      correct: allCorrect,
      cellResults
    });

  } catch (err) {
    logError(err);
    res.status(500).json({
      error: true,
      message: 'Errorea hitza egiaztatzean'
    });
  }
});

/**
 * POST /api/game/solve-cell
 * Zelula baten erantzuna agerian uzten du (pista)
 */
router.post('/solve-cell', actionLimiter, requireGameSession, async (req, res) => {
  try {
    const { row, col } = req.body;

    if (row === undefined || col === undefined) {
      return res.status(400).json({
        error: true,
        message: 'Zelula kokapena beharrezkoa da'
      });
    }

    const puzzle = await CrosswordModel.findById(req.session.currentGame.puzzleId);
    
    if (!puzzle) {
      return res.status(404).json({
        error: true,
        message: 'Puzlea ez da aurkitu'
      });
    }

    const correctValue = puzzle.filled_grid[row][col];
    
    // Erabiltzailearen koadroa eguneratu
    req.session.currentGame.userGrid[row][col] = correctValue;
    req.session.currentGame.hintCount++;

    res.json({
      success: true,
      value: correctValue
    });

  } catch (err) {
    logError(err);
    res.status(500).json({
      error: true,
      message: 'Errorea zelula ebaztean'
    });
  }
});

/**
 * POST /api/game/solve-word
 * Hitz bateko letra guztiak agerian uzten ditu (pista gogorra)
 */
router.post('/solve-word', actionLimiter, requireGameSession, async (req, res) => {
  try {
    const { wordDir, wordX, wordY } = req.body;

    if (wordDir === undefined || wordX === undefined || wordY === undefined) {
      return res.status(400).json({
        error: true,
        message: 'Hitz kokapena beharrezkoa da'
      });
    }

    const puzzle = await CrosswordModel.findById(req.session.currentGame.puzzleId);
    if (!puzzle) {
      return res.status(404).json({
        error: true,
        message: 'Puzlea ez da aurkitu'
      });
    }

    const wordIndex = puzzle.words.findIndex(
      w => w.dir === wordDir && w.x === wordX && w.y === wordY
    );
    if (wordIndex === -1) {
      return res.status(404).json({ error: true, message: 'Hitza ez da aurkitu' });
    }

    const word = puzzle.words[wordIndex];
    const solvedLetters = [];

    // Hitzeko letra guztiak agerian utzi
    if (word.dir === 'right') {
      for (let j = 0; j < word.length; j++) {
        const letter = puzzle.filled_grid[word.x][word.y + j];
        req.session.currentGame.userGrid[word.x][word.y + j] = letter;
        solvedLetters.push({ row: word.x, col: word.y + j, value: letter });
      }
    } else { // down
      for (let i = 0; i < word.length; i++) {
        const letter = puzzle.filled_grid[word.x + i][word.y];
        req.session.currentGame.userGrid[word.x + i][word.y] = letter;
        solvedLetters.push({ row: word.x + i, col: word.y, value: letter });
      }
    }

    req.session.currentGame.hintCount += word.length;

    res.json({
      success: true,
      solvedLetters: solvedLetters
    });

  } catch (err) {
    logError(err);
    res.status(500).json({
      error: true,
      message: 'Errorea hitza ebaztean'
    });
  }
});

/**
 * POST /api/game/check-grid
 * Koadro osoa egiaztatzen du — bezero DOM-etik zelula guztien balioak jasotzen ditu
 */
router.post('/check-grid', actionLimiter, requireGameSession, async (req, res) => {
  try {
    const { cells } = req.body;

    if (!Array.isArray(cells)) {
      return res.status(400).json({ error: true, message: 'Datu osatugabeak' });
    }

    const puzzle = await CrosswordModel.findById(req.session.currentGame.puzzleId);
    
    if (!puzzle) {
      return res.status(404).json({
        error: true,
        message: 'Puzlea ez da aurkitu'
      });
    }

    let totalCells = 0;
    let correctCells = 0;
    let errorCount = 0;
    const cellResults = [];

    cells.forEach(({ row, col, value }) => {
      totalCells++;
      const correctVal = puzzle.filled_grid[row][col];
      const empty = !value || value === '';
      const correct = !empty && correctVal.toUpperCase() === value.toUpperCase();

      if (correct) {
        correctCells++;
        req.session.currentGame.userGrid[row][col] = correctVal;
      } else if (!empty) {
        errorCount++;
      }

      cellResults.push({ row, col, correct, empty });
    });

    const isComplete = correctCells === totalCells;
    const progress = Math.round((correctCells / totalCells) * 100);
    req.session.currentGame.checkCount++;

    // Puzlea osatu gisa markatu eta gordetako koadroa ezabatu
    if (isComplete && req.user) {
      const userId = req.user._id.toString();
      const puzzleId = req.session.currentGame.puzzleId;
      await PlaySession.findOneAndUpdate(
        { userId, puzzleId },
        { $set: { completedAt: new Date() } },
        { upsert: true }
      );
      // Clear persisted grid so next play starts clean
      await GameStateModel.deleteOne({ playerId: userId, puzzleId });
    }

    const responseData = {
      success: true,
      complete: isComplete,
      progress,
      correctCells,
      totalCells,
      hasErrors: errorCount > 0,
      errorCount,
      cellResults
    };

    // Joko estatistikak gehitu puzlea osatzen denean
    if (isComplete) {
      const elapsed = Math.floor((Date.now() - new Date(req.session.currentGame.startedAt).getTime()) / 1000);
      responseData.stats = {
        durationSec: elapsed,
        checks: req.session.currentGame.checkCount,
        hints: req.session.currentGame.hintCount
      };
    }

    res.json(responseData);

  } catch (err) {
    logError(err);
    res.status(500).json({
      error: true,
      message: 'Errorea koadroa egiaztatzean'
    });
  }
});

/**
 * GET /api/game/status
 * Gets current game state
 */
router.get('/status', requireGameSession, (req, res) => {
  res.json({
    success: true,
    game: {
      puzzleId: req.session.currentGame.puzzleId,
      startedAt: req.session.currentGame.startedAt,
      checkCount: req.session.currentGame.checkCount,
      hintCount: req.session.currentGame.hintCount,
      userGrid: req.session.currentGame.userGrid
    }
  });
});

/**
 * POST /api/game/solve-grid
 * Irtenbide osoa agerian uzten du (amore eman)
 */
router.post('/solve-grid', actionLimiter, requireGameSession, async (req, res) => {
  try {
    const puzzle = await CrosswordModel.findById(req.session.currentGame.puzzleId);
    
    if (!puzzle) {
      return res.status(404).json({
        error: true,
        message: 'Puzlea ez da aurkitu'
      });
    }

    // Irtenbide osoa erabiltzailearen koadrora kopiatu
    const allLetters = [];
    for (let i = 0; i < puzzle.height; i++) {
      for (let j = 0; j < puzzle.width; j++) {
        if (puzzle.void_grid[i][j] !== '.') {
          const letter = puzzle.filled_grid[i][j];
          req.session.currentGame.userGrid[i][j] = letter;
          allLetters.push({ row: i, col: j, value: letter });
        }
      }
    }

    // Zelula guztiak pista gisa kontatu
    req.session.currentGame.hintCount += allLetters.length;

    res.json({
      success: true,
      message: 'Puzlea erabat ebatzi da',
      solvedLetters: allLetters
    });

  } catch (err) {
    logError(err);
    res.status(500).json({
      error: true,
      message: 'Errorea koadroa ebaztean'
    });
  }
});

/**
 * POST /api/game/end
 * Ends current game session
 */
router.post('/end', requireGameSession, (req, res) => {
  const gameData = req.session.currentGame;
  delete req.session.currentGame;
  
  res.json({
    success: true,
    message: 'Jokoa amaituta',
    stats: {
      duration: new Date() - new Date(gameData.startedAt),
      checks: gameData.checkCount,
      hints: gameData.hintCount
    }
  });
});

// Helper functions

/**
 * GET /api/game/history/:puzzleId
 * Returns saved grid state for (player, puzzle)
 */
router.get('/history/:puzzleId', async (req, res) => {
  if (!req.user) {
    return res.json({ success: true, cells: [] });
  }
  try {
    const playerId = getPlayerId(req);
    const state = await GameStateModel.findOne({
      playerId,
      puzzleId: req.params.puzzleId
    });
    res.json({
      success: true,
      cells: state ? state.cells : []
    });
  } catch (err) {
    logError(err);
    res.status(500).json({ error: true, message: 'Errorea historia eskuratzean' });
  }
});

/**
 * POST /api/game/history/:puzzleId
 * Saves (upserts) the current grid state for (player, puzzle)
 */
router.post('/history/:puzzleId', actionLimiter, async (req, res) => {
  if (!req.user) {
    return res.json({ success: true });
  }
  try {
    const { cells } = req.body;
    if (!Array.isArray(cells)) {
      return res.status(400).json({ error: true, message: 'Datu osatugabeak' });
    }
    const playerId = getPlayerId(req);
    await GameStateModel.findOneAndUpdate(
      { playerId, puzzleId: req.params.puzzleId },
      { cells, updatedAt: new Date() },
      { upsert: true, new: true }
    );
    res.json({ success: true });
  } catch (err) {
    logError(err);
    res.status(500).json({ error: true, message: 'Errorea historia gordetzean' });
  }
});

// ---------------------------------------------------------------------------

function createEmptyGrid(void_grid) {
  return void_grid.map(row => 
    row.map(cell => cell === '.' ? '.' : '')
  );
}

function sanitizeWords(words) {
  // Remove property 'word' que contiene la respuesta
  return words.map(w => ({
    dir: w.dir,
    x: w.x,
    y: w.y,
    length: w.length,
    number: w.number
    // Do NOT include w.word
  }));
}

module.exports = router;
