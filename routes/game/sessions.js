const express = require('express');
const GameStateModel = require('../../models/gamestate');
const PlaySession = require('../../models/playsession');
const { logError, logInfo } = require('../../utils');
const { createEmptyGrid } = require('../../services/game-grid');
const { startLimiter, requireGameSession } = require('./middleware');
const { findPuzzleById, respondPuzzleNotFound } = require('./puzzle-helpers');
const router = express.Router();

// Return only fields needed by the client; never include the solution.
function serializeGameWords(words) {
  return words.map(({ dir, x, y, length, number }) => ({
    dir,
    x,
    y,
    length,
    number
  }));
}

/**
 * POST /api/game/start/:id
 * Starts a new game session
 */
router.post('/start/:id', startLimiter, async (req, res) => {
  try {
    const puzzle = await findPuzzleById(req.params.id);

    if (!puzzle) {
      return respondPuzzleNotFound(res);
    }

    // Create game state in session
    const gameType = puzzle.gameType || (puzzle.format === 'spl' ? 'spiral' : 'crossword');

    req.session.currentGame = {
      puzzleId: puzzle._id.toString(),
      gameType,
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
        gameType,
        void_grid: puzzle.void_grid,
        words: serializeGameWords(puzzle.words),
        clues: puzzle.clues,
        spiral: puzzle.spiral || null
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
 * GET /api/game/status
 * Gets current game state
 */
router.get('/status', requireGameSession, (req, res) => {
  const game = req.session.currentGame;
  res.json({
    success: true,
    game: {
      puzzleId:       game.puzzleId,
      gameType:       game.gameType || 'crossword',
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
    const userId = req.user._id.toString();
    const puzzleId = game.puzzleId;
    GameStateModel.findOneAndUpdate(
      { playerId: userId, puzzleId },
      { elapsedSeconds: game.elapsedSeconds, usedVerify: game.usedVerify || false, updatedAt: new Date() },
      { upsert: true }
    ).catch(err => logError(err));
    PlaySession.findOneAndUpdate(
      { userId, puzzleId },
      { $set: { elapsedSeconds: game.elapsedSeconds } },
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

module.exports = router;
