const express = require('express');
const router = express.Router();
const CrosswordModel = require('../models/crosswords');
const UserModel = require('../models/user');
const PlaySession = require('../models/playsession');
const fs = require('fs');
const path = require('path');

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

    // Ensure downloads directory exists and list files
    const downloadsDir = path.join(__dirname, '..', 'downloads');
    try {
      await fs.promises.mkdir(downloadsDir, { recursive: true });
    } catch (e) {
      console.error('Could not ensure downloads dir', e);
    }
    let downloadsFiles = [];
    try {
      const names = (await fs.promises.readdir(downloadsDir)).filter(f => !f.startsWith('.'));
      // Collect stats for each file
      const fileInfos = await Promise.all(names.map(async (f) => {
        const p = path.join(downloadsDir, f);
        try {
          const st = await fs.promises.stat(p);
          return {
            name: f,
            size: st.size,
            mtime: st.mtime
          };
        } catch (e) {
          return { name: f };
        }
      }));
      // humanize size
      function humanize(bytes) {
        if (!bytes && bytes !== 0) return '';
        const units = ['B','KB','MB','GB','TB'];
        let i = 0;
        let val = bytes;
        while (val >= 1024 && i < units.length-1) { val /= 1024; i++; }
        return Math.round(val*10)/10 + units[i];
      }
      downloadsFiles = fileInfos.map(fi => ({
        name: fi.name,
        size: fi.size != null ? fi.size : null,
        sizeDisplay: fi.size != null ? humanize(fi.size) : '',
        mtime: fi.mtime || null,
        mtimeDisplay: fi.mtime ? new Date(fi.mtime).toLocaleString('eu') : ''
      }));
    } catch (e) {
      console.error('Could not read downloads dir', e);
    }

    res.render('master', {
      title: 'Master panela',
      stats,
      puzzles,
      users,
      completionMap,
      userStats,
      recentCompletions,
      externalApiKey: process.env.EXTERNAL_API_KEY || ''
      , downloadsFiles
    });
  } catch (err) {
    console.error(err);
    res.status(500).render('message', { message: 'Errore bat gertatu da', type: 'danger' });
  }
});

// Secure download endpoint for master users
router.get('/download/:name', requireMaster, (req, res) => {
  const name = req.params.name;
  if (!name || name.includes('..') || name.includes('/') || name.includes('\\')) return res.status(400).render('message', { message: 'Izena baliogabea', type: 'danger' });
  const downloadsDir = path.join(__dirname, '..', 'downloads');
  const filePath = path.join(downloadsDir, name);
  const resolved = path.resolve(filePath);
  if (!resolved.startsWith(path.resolve(downloadsDir))) return res.status(400).render('message', { message: 'Sarbidea ukatua', type: 'danger' });
  fs.stat(filePath, (err, stat) => {
    if (err || !stat.isFile()) return res.status(404).render('message', { message: 'Fitxategia ez da aurkitu', type: 'warning' });
    res.download(filePath, name, (err) => {
      if (err) console.error('Download error', err);
    });
  });
});

module.exports = router;

// Delete file (master only)
router.post('/download/:name/delete', requireMaster, async (req, res) => {
  const name = req.params.name;
  if (!name || name.includes('..') || name.includes('/') || name.includes('\\')) {
    req.flash('warning','Izena baliogabea');
    return res.redirect('/master');
  }
  const downloadsDir = path.join(__dirname, '..', 'downloads');
  const filePath = path.join(downloadsDir, name);
  try {
    const resolved = path.resolve(filePath);
    if (!resolved.startsWith(path.resolve(downloadsDir))) throw new Error('invalid');
    await fs.promises.unlink(filePath);
    req.flash('success', 'Fitxategia ezabatu da');
  } catch (e) {
    console.error('Delete error', e);
    req.flash('warning', 'Ezin izan da fitxategia ezabatu');
  }
  res.redirect('/master');
});
