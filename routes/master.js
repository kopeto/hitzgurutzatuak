const express = require('express');
const router = express.Router();
const CrosswordModel = require('../models/crosswords');
const UserModel = require('../models/user');
const PlaySession = require('../models/playsession');

// Middleware: only master users
function requireMaster(req, res, next) {
  if (req.isAuthenticated() && req.user.master) return next();
  res.status(403).render('message', { message: 'Sarbidea ukatua', type: 'danger' });
}

router.get('/', requireMaster, async (req, res) => {
  try {
    const [puzzles, users, allSessions] = await Promise.all([
      CrosswordModel.find({}).lean(),
      UserModel.find({}).lean(),
      PlaySession.find({}).lean()
    ]);

    // Completion count per puzzle
    const completionMap = {};
    allSessions.forEach(s => {
      if (s.completedAt) {
        const key = s.puzzleId.toString();
        completionMap[key] = (completionMap[key] || 0) + 1;
      }
    });

    // Per-user stats
    const userStats = {};
    allSessions.forEach(s => {
      const key = s.userId.toString();
      if (!userStats[key]) userStats[key] = { completed: 0, inProgress: 0 };
      if (s.completedAt) userStats[key].completed++;
      else userStats[key].inProgress++;
    });

    // Recent 20 completions enriched with names
    const puzzleNameMap = {};
    puzzles.forEach(p => { puzzleNameMap[p._id.toString()] = p.name; });
    const usernameMap = {};
    users.forEach(u => { usernameMap[u._id.toString()] = u.username; });

    const recentCompletions = allSessions
      .filter(s => s.completedAt)
      .sort((a, b) => new Date(b.completedAt) - new Date(a.completedAt))
      .slice(0, 20)
      .map(s => ({
        ...s,
        puzzleName: puzzleNameMap[s.puzzleId] || s.puzzleId,
        username:   usernameMap[s.userId]     || s.userId
      }));

    const stats = {
      puzzles:        puzzles.length,
      users:          users.length,
      completions:    allSessions.filter(s => s.completedAt).length,
      activeSessions: allSessions.filter(s => !s.completedAt).length
    };

    res.render('master', {
      title: 'Master panela',
      stats,
      puzzles,
      users,
      completionMap,
      userStats,
      recentCompletions
    });
  } catch (err) {
    console.error(err);
    res.status(500).render('message', { message: 'Errore bat gertatu da', type: 'danger' });
  }
});

module.exports = router;
