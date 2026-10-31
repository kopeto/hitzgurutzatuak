const Crossword = require('../models/crosswords');
const PlaySession = require('../models/playsession');
const GameState = require('../models/gamestate');
const { withGroupWrite } = require('./game-groups');

async function deletePuzzleRecords(ids) {
  return withGroupWrite(async () => {
    const puzzles = await Crossword.find({ _id: { $in: ids } }, '_id').lean();
    const deletedIds = puzzles.map(puzzle => String(puzzle._id));
    if (!deletedIds.length) return [];
    await Promise.all([
      PlaySession.deleteMany({ puzzleId: { $in: deletedIds } }),
      GameState.deleteMany({ puzzleId: { $in: deletedIds } })
    ]);
    // Memberships live on the game, so deleting it removes it from every group.
    await Crossword.deleteMany({ _id: { $in: deletedIds } });
    return deletedIds;
  });
}

module.exports = { deletePuzzleRecords };
