const express = require('express');
const GameStateModel = require('../../models/gamestate');
const PlaySession = require('../../models/playsession');
const { logError } = require('../../utils');
const { actionLimiter } = require('./middleware');
const router = express.Router();

function getUserId(req) {
  return req.user._id.toString();
}

/**
 * GET /api/game/history/:puzzleId
 * Returns saved grid state for (player, puzzle)
 */
router.get('/history/:puzzleId', async (req, res) => {
  if (!req.user) {
    return res.json({ success: true, cells: [] });
  }
  try {
    const playerId = getUserId(req);
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
    const playerId = getUserId(req);
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
 * Wipes this player's saved state and current session so the puzzle can restart.
 */
router.delete('/reset/:puzzleId', async (req, res) => {
  try {
    const puzzleId = req.params.puzzleId;
    if (req.user) {
      const userId = getUserId(req);
      await Promise.all([
        PlaySession.deleteOne({ userId, puzzleId }),
        GameStateModel.deleteOne({ playerId: userId, puzzleId })
      ]);
    }
    if (req.session.currentGame?.puzzleId === puzzleId) delete req.session.currentGame;
    res.json({ success: true });
  } catch (err) {
    logError(err);
    res.status(500).json({ error: true, message: 'Errorea berrabiaraztean' });
  }
});

module.exports = router;
