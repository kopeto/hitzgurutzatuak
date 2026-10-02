const express = require('express');
const GameStateModel = require('../../models/gamestate');
const PlaySession = require('../../models/playsession');
const { logError } = require('../../utils');
const { actionLimiter, requireGameSession } = require('./middleware');
const { findCurrentPuzzle, respondPuzzleNotFound } = require('./puzzle-helpers');
const router = express.Router();

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

    const puzzle = await findCurrentPuzzle(req);

    if (!puzzle) {
      return respondPuzzleNotFound(res);
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

    const puzzle = await findCurrentPuzzle(req);
    if (!puzzle) {
      return respondPuzzleNotFound(res);
    }

    const wordExists = puzzle.words.some(
      word => word.dir === wordDir && word.x === wordX && word.y === wordY
    );
    if (!wordExists) {
      return res.status(404).json({
        error: true,
        message: 'Hitza ez da aurkitu'
      });
    }

    const cellResults = cells.map(({ row, col, value }) => {
      const correct = puzzle.filled_grid[row][col].toUpperCase() === (value || '').toUpperCase();

      // Update session userGrid only for correct cells
      if (correct) {
        req.session.currentGame.userGrid[row][col] = puzzle.filled_grid[row][col];
      }

      return { row, col, correct, correctLetter: correct ? undefined : puzzle.filled_grid[row][col] };
    });

    const wrongCount = cellResults.filter(r => !r.correct).length;
    const allCorrect = wrongCount === 0;
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
 * POST /api/game/check-grid
 * Koadro osoa egiaztatzen du — bezero DOM-etik zelula guztien balioak jasotzen ditu
 */
router.post('/check-grid', actionLimiter, requireGameSession, async (req, res) => {
  try {
    const { cells } = req.body;

    if (!Array.isArray(cells)) {
      return res.status(400).json({ error: true, message: 'Datu osatugabeak' });
    }

    const puzzle = await findCurrentPuzzle(req);

    if (!puzzle) {
      return respondPuzzleNotFound(res);
    }

    const totalCells = cells.length;
    const cellResults = cells.map(({ row, col, value }) => {
      const correctVal = puzzle.filled_grid[row][col];
      const empty = !value || value === '';
      const correct = !empty && correctVal.toUpperCase() === value.toUpperCase();

      if (correct) {
        req.session.currentGame.userGrid[row][col] = correctVal;
      }

      return { row, col, correct, empty, correctLetter: correct ? undefined : correctVal };
    });

    const correctCells = cellResults.filter(result => result.correct).length;
    const errorCount = totalCells - correctCells;
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
        errorCount,
        usedVerify:     game.usedVerify || false,
        usedHints:      (game.hintCount || 0) > 0
      };
      // check-grid always ends the game
      sessionUpdate.completedAt = new Date();
      // Save submitted cells as the final completed state (so returning to game shows frozen result)
      const finalCells = cells
        .filter(cell => cell.value)
        .map(c => ({ row: c.row, col: c.col, value: c.value }));
      const finalCellResults = cellResults.map(result => ({
        row: result.row,
        col: result.col,
        correct: result.correct,
        empty: result.empty || false,
        correctLetter: result.correct ? undefined : result.correctLetter
      }));
      await GameStateModel.findOneAndUpdate(
        { playerId: userId, puzzleId },
        {
          cells: finalCells,
          cellResults: finalCellResults,
          elapsedSeconds: totalElapsed,
          usedVerify: game.usedVerify || false,
          completed: true,
          updatedAt: new Date()
        },
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

module.exports = router;
