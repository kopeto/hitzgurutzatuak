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
    if (!isCorrect) {
      req.session.currentGame.errorCount = (req.session.currentGame.errorCount || 0) + 1;
    }
    req.session.currentGame.usedVerify = true;

    res.json({
      success: true,
      correct: isCorrect,
      correctLetter: isCorrect ? undefined : correctValue
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

      return { row, col, correct, correctLetter: correct ? undefined : puzzle.filled_grid[row][col] };
    });

    const wrongCount = cellResults.filter(r => !r.correct).length;
    req.session.currentGame.errorCount = (req.session.currentGame.errorCount || 0) + wrongCount;
    req.session.currentGame.usedVerify = true;
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
      } else {
        errorCount++; // both wrong and empty cells count as errors
      }

      cellResults.push({ row, col, correct, empty, correctLetter: correct ? undefined : correctVal });
    });

    const isComplete = correctCells === totalCells;
    const progress = Math.round((correctCells / totalCells) * 100);
    req.session.currentGame.checkCount++;

    // Stop the game timer
    const game = req.session.currentGame;
    if (game.timerStartedAt) {
      const delta = Math.floor((Date.now() - new Date(game.timerStartedAt).getTime()) / 1000);
      game.elapsedSeconds = (game.elapsedSeconds || 0) + delta;
      game.timerStartedAt = null;
    }
    const totalElapsed = game.elapsedSeconds || 0;

    // Save stats to PlaySession for authenticated users (always, not only on complete)
    if (req.user) {
      const userId = req.user._id.toString();
      const puzzleId = game.puzzleId;
      const sessionUpdate = {
        elapsedSeconds: totalElapsed,
        errorCount:     errorCount,
        usedVerify:     game.usedVerify || false,
        usedHints:      (game.hintCount || 0) > 0
      };
      // check-grid always ends the game
      sessionUpdate.completedAt = new Date();
      // Save submitted cells as the final completed state (so returning to game shows frozen result)
      const finalCells = cells
        .filter(c => c.value && c.value !== '')
        .map(c => ({ row: c.row, col: c.col, value: c.value }));
      const finalCellResults = cellResults.map(r => ({
        row:          r.row,
        col:          r.col,
        correct:      r.correct,
        empty:        r.empty || false,
        correctLetter: r.correct ? undefined : r.correctLetter
      }));
      await GameStateModel.findOneAndUpdate(
        { playerId: userId, puzzleId },
        { cells: finalCells, cellResults: finalCellResults, elapsedSeconds: totalElapsed, usedVerify: game.usedVerify || false, completed: true, updatedAt: new Date() },
        { upsert: true }
      );
      await PlaySession.findOneAndUpdate(
        { userId, puzzleId },
        { $set: sessionUpdate },
        { upsert: true }
      );
    }

    const responseData = {
      success: true,
      complete: isComplete,
      progress,
      correctCells,
      totalCells,
      hasErrors: errorCount > 0,
      errorCount,
      cellResults,
      stats: {
        durationSec: totalElapsed,
        checks:      game.checkCount,
        hints:       game.hintCount,
        errors:      errorCount,
        usedVerify:  game.usedVerify || false,
        usedHints:   (game.hintCount || 0) > 0
      }
    };

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
  const game = req.session.currentGame;
  res.json({
    success: true,
    game: {
      puzzleId:       game.puzzleId,
      startedAt:      game.startedAt,
      checkCount:     game.checkCount,
      hintCount:      game.hintCount,
      userGrid:       game.userGrid,
      elapsedSeconds: game.elapsedSeconds || 0,
      timerStartedAt: game.timerStartedAt || null
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

/**
 * POST /api/game/timer/pause
 * Freezes the game timer: accumulates elapsed seconds and clears timerStartedAt.
 * Persists elapsed time to GameStateModel for authenticated users.
 */
router.post('/timer/pause', requireGameSession, async (req, res) => {
  const game = req.session.currentGame;
  if (game.timerStartedAt) {
    const delta = Math.floor((Date.now() - new Date(game.timerStartedAt).getTime()) / 1000);
    game.elapsedSeconds = (game.elapsedSeconds || 0) + delta;
    game.timerStartedAt = null;
  }
  if (req.user) {
    GameStateModel.findOneAndUpdate(
      { playerId: req.user._id.toString(), puzzleId: game.puzzleId },
      { elapsedSeconds: game.elapsedSeconds, usedVerify: game.usedVerify || false, updatedAt: new Date() },
      { upsert: true }
    ).catch(err => logError(err));
  }
  res.json({ success: true, elapsedSeconds: game.elapsedSeconds || 0 });
});

/**
 * POST /api/game/timer/resume
 * Restarts the game timer from the current accumulated time.
 */
router.post('/timer/resume', requireGameSession, (req, res) => {
  const game = req.session.currentGame;
  game.timerStartedAt = new Date();
  res.json({ success: true, elapsedSeconds: game.elapsedSeconds || 0 });
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

/**
 * DELETE /api/game/reset/:puzzleId
 * Wipes PlaySession and GameState so the player can start fresh.
 * Only available for authenticated users.
 */
router.delete('/reset/:puzzleId', async (req, res) => {
  if (!req.user) {
    return res.status(401).json({ error: true, message: 'Saioa hasi behar duzu' });
  }
  try {
    const userId = req.user._id.toString();
    const puzzleId = req.params.puzzleId;
    await Promise.all([
      PlaySession.deleteOne({ userId, puzzleId }),
      GameStateModel.deleteOne({ playerId: userId, puzzleId })
    ]);
    delete req.session.currentGame;
    res.json({ success: true });
  } catch (err) {
    logError(err);
    res.status(500).json({ error: true, message: 'Errorea berrabiaraztean' });
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
