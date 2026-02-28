const mongoose = require('mongoose');

/**
 * Tracks each logged-in user's play progress per puzzle.
 * One document per (userId, puzzleId). Created when the user first opens the game,
 * updated with completedAt when they verify the full grid correctly.
 */
const playSessionSchema = mongoose.Schema({
  userId:      { type: String, required: true },
  puzzleId:    { type: String, required: true },
  startedAt:   { type: Date, default: Date.now },
  completedAt: { type: Date, default: null }
});

playSessionSchema.index({ userId: 1, puzzleId: 1 }, { unique: true });

module.exports = mongoose.model('PlaySession', playSessionSchema);
