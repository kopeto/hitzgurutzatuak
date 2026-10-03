const express = require('express');
const router = express.Router();
const CrosswordModel = require('../models/crosswords');
const UserModel = require('../models/user');
const PlaySession = require('../models/playsession');
const fs = require('fs');
const path = require('path');
const { renderReact, serializePuzzleSummary } = require('../services/react-view');

function requireMaster(req, res, next) {
  if (req.isAuthenticated() && req.user.master) return next();
  return renderReact(res, 'message', { message: 'Sarbidea ukatua', type: 'danger' }, { status: 403 });
}

router.get('/', requireMaster, async (req, res) => {
  try {
    const [puzzles, users, allSessions] = await Promise.all([
      CrosswordModel.find({}).lean(),
      UserModel.find({}).lean(),
      PlaySession.find({}).lean()
    ]);

    const completionMap = {};
    const userStats = {};
    allSessions.forEach(s => {
      if (s.completedAt) {
        const puzzleId = s.puzzleId.toString();
        completionMap[puzzleId] = (completionMap[puzzleId] || 0) + 1;
      }

      const key = s.userId.toString();
      if (!userStats[key]) userStats[key] = { completed: 0, inProgress: 0 };
      if (s.completedAt) userStats[key].completed++;
      else userStats[key].inProgress++;
    });

    const puzzleNameMap = {};
    puzzles.forEach(p => { puzzleNameMap[p._id.toString()] = p.name; });
    const usernameMap = {};
    users.forEach(u => { usernameMap[u._id.toString()] = u.username; });

    const completedSessions = allSessions.filter(s => s.completedAt);
    const recentCompletions = completedSessions
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
      completions: completedSessions.length,
      activeSessions: allSessions.length - completedSessions.length
    };

    const downloadsDir = path.join(__dirname, '..', 'downloads');
    try {
      await fs.promises.mkdir(downloadsDir, { recursive: true });
    } catch (e) {
      console.error('Ezin izan da deskargen karpeta sortu edo egiaztatu:', e);
    }
    let downloadsFiles = [];
    try {
      const names = (await fs.promises.readdir(downloadsDir)).filter(f => !f.startsWith('.'));
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
      console.error('Ezin izan da deskargen karpeta irakurri:', e);
    }

    return renderReact(res, 'master', {
      stats,
      puzzles: puzzles.map(serializePuzzleSummary),
      users: users.map(({ _id, username, email, master }) => ({ _id, username, email, master })),
      completionMap,
      userStats,
      recentCompletions,
      downloadsFiles
    }, { title: res.locals.t('page.master') });
  } catch (err) {
    console.error(err);
    return renderReact(res, 'message', { message: 'Errore bat gertatu da', type: 'danger' }, { status: 500 });
  }
});

router.get('/download/:name', requireMaster, (req, res) => {
  const name = req.params.name;
  if (!name || name.includes('..') || name.includes('/') || name.includes('\\')) return renderReact(res, 'message', { message: 'Izena baliogabea', type: 'danger' }, { status: 400 });
  const downloadsDir = path.join(__dirname, '..', 'downloads');
  const filePath = path.join(downloadsDir, name);
  const resolved = path.resolve(filePath);
  if (!resolved.startsWith(path.resolve(downloadsDir))) return renderReact(res, 'message', { message: 'Sarbidea ukatua', type: 'danger' }, { status: 400 });
  fs.stat(filePath, (err, stat) => {
    if (err || !stat.isFile()) return renderReact(res, 'message', { message: 'Fitxategia ez da aurkitu', type: 'warning' }, { status: 404 });
    res.download(filePath, name, (err) => {
      if (err) console.error('Errorea fitxategia deskargatzean:', err);
    });
  });
});

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
    console.error('Errorea fitxategia ezabatzean:', e);
    req.flash('warning', 'Ezin izan da fitxategia ezabatu');
  }
  res.redirect('/master');
});

module.exports = router;
