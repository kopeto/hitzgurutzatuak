const express = require('express');
const GameStateModel = require('../../models/gamestate');
const PlaySession = require('../../models/playsession');
const { logError } = require('../../utils');
const { actionLimiter, requireGameSession } = require('./middleware');
const { findCurrentPuzzle, respondPuzzleNotFound } = require('./puzzle-helpers');
const router = express.Router();

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

    const puzzle = await findCurrentPuzzle(req);

    if (!puzzle) {
      return respondPuzzleNotFound(res);
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

    const puzzle = await findCurrentPuzzle(req);
    if (!puzzle) {
      return respondPuzzleNotFound(res);
    }

    const word = puzzle.words.find(
      candidate => candidate.dir === wordDir && candidate.x === wordX && candidate.y === wordY
    );
    if (!word) {
      return res.status(404).json({ error: true, message: 'Hitza ez da aurkitu' });
    }

    const solvedLetters = [];

    for (let index = 0; index < word.length; index++) {
      const row = word.x + (word.dir === 'right' ? 0 : index);
      const col = word.y + (word.dir === 'right' ? index : 0);
      const letter = puzzle.filled_grid[row][col];
      req.session.currentGame.userGrid[row][col] = letter;
      solvedLetters.push({ row, col, value: letter });
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
 * POST /api/game/solve-grid
 * Irtenbide osoa agerian uzten du (amore eman)
 */
router.post('/solve-grid', actionLimiter, requireGameSession, async (req, res) => {
  try {
    const puzzle = await findCurrentPuzzle(req);

    if (!puzzle) {
      return respondPuzzleNotFound(res);
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

    const game = req.session.currentGame;
    game.hintCount += allLetters.length;
    if (game.timerStartedAt) {
      game.elapsedSeconds = (game.elapsedSeconds || 0)
        + Math.floor((Date.now() - new Date(game.timerStartedAt).getTime()) / 1000);
      game.timerStartedAt = null;
    }

    if (req.user) {
      const userId = req.user._id.toString();
      const puzzleId = game.puzzleId;
      const completedAt = new Date();
      const cellResults = allLetters.map(({ row, col }) => ({ row, col, correct: true, empty: false }));
      await Promise.all([
        GameStateModel.findOneAndUpdate(
          { playerId: userId, puzzleId },
          {
            cells: allLetters,
            cellResults,
            elapsedSeconds: game.elapsedSeconds || 0,
            usedVerify: game.usedVerify || false,
            completed: true,
            updatedAt: completedAt
          },
          { upsert: true }
        ),
        PlaySession.findOneAndUpdate(
          { userId, puzzleId },
          { $set: {
            completedAt,
            elapsedSeconds: game.elapsedSeconds || 0,
            errorCount: game.errorCount || 0,
            usedVerify: game.usedVerify || false,
            usedHints: true
          } },
          { upsert: true }
        )
      ]);
    }

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

module.exports = router;
