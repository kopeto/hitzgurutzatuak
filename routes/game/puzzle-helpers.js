const CrosswordModel = require('../../models/crosswords');

const puzzleNotFoundMessage = 'Puzlea ez da aurkitu';

function findPuzzleById(puzzleId) {
  return CrosswordModel.findById(puzzleId);
}

function findCurrentPuzzle(req) {
  return findPuzzleById(req.session.currentGame.puzzleId);
}

function respondPuzzleNotFound(res) {
  return res.status(404).json({ error: true, message: puzzleNotFoundMessage });
}

module.exports = { findPuzzleById, findCurrentPuzzle, respondPuzzleNotFound };
