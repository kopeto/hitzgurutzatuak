const mongoose = require('mongoose');

// Stores the current grid state for a (player, puzzle) pair.
// Only non-empty cells are stored. The undo/redo chain lives only in the client.
// playerId can be a userId (logged in) or a session ID (anonymous).
const GameStateSchema = new mongoose.Schema({
  playerId:  { type: String, required: true, index: true },
  puzzleId:  { type: String, required: true, index: true },
  cells: [{
    row:   Number,
    col:   Number,
    value: String,
    _id:   false
  }],
  elapsedSeconds: { type: Number, default: 0 },
  usedVerify:     { type: Boolean, default: false },
  completed:      { type: Boolean, default: false },
  updatedAt: { type: Date, default: Date.now }
});

GameStateSchema.index({ playerId: 1, puzzleId: 1 }, { unique: true });

module.exports = mongoose.model('GameState', GameStateSchema);
