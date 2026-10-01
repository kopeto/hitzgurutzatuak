const {logDate, logError} = require('../utils.js');
const checkAuth = require('../auth/authenticate.js');
const express = require('express');
const fs = require('fs/promises');
const router = express.Router();
const CrosswordModel = require('../models/crosswords');
const PuzzleUploadBatch = require('../models/puzzleuploadbatch');
const PlaySession = require('../models/playsession');
const GameStateModel = require('../models/gamestate');
const upload = require('../config/uploadconfig');
const { PuzzleImportError, importPuzzle } = require('../services/puzzle-import');
const { enqueueBatch } = require('../services/puzzle-upload-queue');
const { renderReact, serializePuzzleSummary } = require('../services/react-view');

function requireMaster(req, res, next) {
  if (req.isAuthenticated() && req.user.master) return next();
  return renderReact(res, 'message', { message: 'Sarbidea ukatua', type: 'danger' }, { status: 403 });
}

// Helper: strip solution data before sending to client.
// clues[] is the flat DB array (always populated); w.clue is a per-word copy (only on newer uploads).
function sanitizeWords(words, clues, format) {
  return words.map((w, i) => ({
    dir: w.dir,
    x: w.x,
    y: w.y,
    length: w.length,
    number: format === 'ipuz' ? null : w.number,
    clue: (clues && clues[i]) ? clues[i] : (w.clue || ''),
    format
    // Do NOT include w.word (the answer)
  }));
}

// Helper: build an empty user grid from void_grid template
function createEmptyGrid(void_grid) {
  return void_grid.map(row =>
    row.map(cell => (cell === '.' ? '.' : ''))
  );
}

router.get('/', async (req, res) => {
  try {
    const puzzles = await CrosswordModel.find({});

    // For logged-in users build a map puzzleId → session info
    let statusMap = {};
    if (req.user) {
      const userId = req.user._id.toString();
      const sessions = await PlaySession.find({ userId, puzzleId: { $in: puzzles.map(p => p._id.toString()) } });
      sessions.forEach(s => {
        statusMap[s.puzzleId] = {
          status:         s.completedAt ? 'completed' : 'started',
          elapsedSeconds: s.elapsedSeconds || 0,
          errorCount:     s.errorCount || 0,
          usedVerify:     s.usedVerify || false,
          usedHints:      s.usedHints || false
        };
      });
    }

    return renderReact(res, 'puzzles', { puzzles: puzzles.map(serializePuzzleSummary), statusMap }, { title: res.locals.t('page.puzzles') });
  } catch (err) {
    logError(err);
    return renderReact(res, 'puzzles', { puzzles: [], statusMap: {} }, { title: res.locals.t('page.puzzles') });
  }
});

router.get('/upload', checkAuth, (req, res) => {
  return renderReact(res, 'upload', {
    maxUploadFiles: upload.maxBatchFiles,
    maxUploadFileSize: upload.maxFileSize
  }, { title: res.locals.t('page.upload') });
});

function serializeUploadBatch(batch) {
  const files = batch.files.map(file => ({
    id: String(file._id),
    filename: file.filename,
    status: file.status,
    message: file.message,
    puzzleId: file.puzzleId ? String(file.puzzleId) : null,
    puzzleName: file.puzzleName
  }));
  const processed = files.filter(file => file.status === 'imported' || file.status === 'failed').length;

  return {
    id: String(batch._id),
    status: batch.status,
    total: files.length,
    processed,
    succeeded: files.filter(file => file.status === 'imported').length,
    failed: files.filter(file => file.status === 'failed').length,
    files
  };
}

async function removeUploadedFiles(files = []) {
  await Promise.all(files.map(async file => {
    if (!file.path) return;
    try {
      await fs.unlink(file.path);
    } catch (error) {
      if (error.code !== 'ENOENT') logError(error);
    }
  }));
}

router.post('/upload/batches', checkAuth, upload.multiple, async (req, res) => {
  if (req.uploadFatal) {
    await removeUploadedFiles(req.files);
    return res.status(req.uploadFatalStatus || 400).json({
      error: (req.uploadErrors || []).map(error => error.message).join(' ')
    });
  }

  const uploadedFiles = req.files || [];
  const rejectedFiles = req.uploadErrors || [];
  if (!uploadedFiles.length && !rejectedFiles.length) {
    return res.status(400).json({ error: 'Hautatu gutxienez fitxategi bat.' });
  }

  const files = [
    ...uploadedFiles.map(file => ({
      filename: file.originalname,
      storedFilename: file.filename,
      status: 'queued'
    })),
    ...rejectedFiles.map(file => ({
      filename: file.filename || 'Fitxategi ezezaguna',
      status: 'failed',
      message: file.message
    }))
  ];

  try {
    const batch = await PuzzleUploadBatch.create({
      ownerId: req.user._id,
      status: uploadedFiles.length ? 'queued' : 'completed_with_errors',
      files,
      completedAt: uploadedFiles.length ? null : new Date()
    });
    if (uploadedFiles.length) enqueueBatch(batch._id);
    return res.status(202).json(serializeUploadBatch(batch));
  } catch (error) {
    await removeUploadedFiles(uploadedFiles);
    logError(error);
    return res.status(500).json({ error: 'Ezin izan da karga sortu.' });
  }
});

router.get('/upload/batches/:id', checkAuth, async (req, res) => {
  if (!/^[a-f\d]{24}$/i.test(req.params.id)) {
    return res.status(404).json({ error: 'Karga ez da aurkitu.' });
  }

  try {
    const batch = await PuzzleUploadBatch.findOne({ _id: req.params.id, ownerId: req.user._id });
    if (!batch) return res.status(404).json({ error: 'Karga ez da aurkitu.' });
    return res.json(serializeUploadBatch(batch));
  } catch (error) {
    logError(error);
    return res.status(500).json({ error: 'Ezin izan da kargaren egoera irakurri.' });
  }
});

router.get('/spiral-builder', checkAuth, requireMaster, (req, res) => {
  return renderReact(res, 'spiralBuilder', {}, { title: res.locals.t('page.spiralBuilder') });
});

router.post('/upload', checkAuth, upload, async (req, res) => {
  if (req.uploadErrors !== undefined) {
    req.uploadErrors.forEach((err) => {
      req.flash('danger', '\'' + err.filename + '\' ' + err.message);
    });
    return res.redirect('/jokoak');
  }

  try {
    await importPuzzle(req.file);
    req.flash('success', 'Puzlea Kargatuta');
    res.redirect('/jokoak');
  } catch (err) {
    if (err instanceof PuzzleImportError || err.code === 11000) {
      req.flash('danger', err.message || 'Puzle hau dagoeneko sisteman dago.');
    } else {
      logError(err);
      req.flash('danger', 'Ezin izan da puzlea kargatu.');
    }
    res.redirect('/jokoak');
  }
});

router.get('/game/:id', async (req, res) => {
  try {
    const puzzle = await CrosswordModel.findById(req.params.id);
    if (!puzzle) {
      req.flash('danger', 'Puzlea ez da aurkitu.');
      return res.redirect('/jokoak');
    }

    // Load persisted state for authenticated users
    let savedElapsed = 0;
    let savedUsedVerify = false;
    let isCompleted = false;
    let savedCellResults = null;
    if (req.user) {
      const savedState = await GameStateModel.findOne({
        playerId: req.user._id.toString(),
        puzzleId: puzzle._id.toString()
      });
      if (savedState) {
        savedElapsed = savedState.elapsedSeconds || 0;
        savedUsedVerify = savedState.usedVerify || false;
        isCompleted = savedState.completed || false;
        if (savedState.cellResults && savedState.cellResults.length > 0) {
          savedCellResults = savedState.cellResults;
        }
      }
    }

    // Store solution in session — never sent to client
    const gameType = puzzle.gameType || (puzzle.format === 'spl' ? 'spiral' : 'crossword');

    req.session.currentGame = {
      puzzleId:       puzzle._id.toString(),
      gameType,
      startedAt:      new Date(),
      userGrid:       createEmptyGrid(puzzle.void_grid),
      checkCount:     0,
      hintCount:      0,
      elapsedSeconds: savedElapsed,
      timerStartedAt: isCompleted ? null : new Date(),
      errorCount:     0,
      usedVerify:     savedUsedVerify
    };

    // Record play start for logged-in users (only if not already completed)
    if (req.user && !isCompleted) {
      await PlaySession.findOneAndUpdate(
        { userId: req.user._id.toString(), puzzleId: puzzle._id.toString() },
        { $set: { startedAt: new Date() } },
        { upsert: true, new: true }
      );
    }

    const gamePayload = {
      id:             puzzle._id.toString(),
      name:           puzzle.name,
      author:         puzzle.author,
      width:          puzzle.width,
      height:         puzzle.height,
      void_grid:      puzzle.void_grid,
      words:          sanitizeWords(puzzle.words, puzzle.clues, puzzle.format),
      completed:      isCompleted,
      elapsedSeconds: savedElapsed,
      cellResults:    savedCellResults,
      format:         puzzle.format || 'puz',
      gameType,
      spiral:         puzzle.spiral || null
    };

    if (gamePayload.gameType === 'spiral') {
      return renderReact(res, 'spiralGame', { puzzle: gamePayload }, { title: res.locals.t('page.game') });
    }

    // Send sanitized puzzle to crossword view (no filled_grid, no word answers)
    return renderReact(res, 'game', { puzzle: gamePayload }, { title: res.locals.t('page.game') });
  } catch (err) {
    logError(err);
    req.flash('danger', 'Erroreren bat gertatu da.');
    res.redirect('/jokoak');
  }
});

router.delete('/game/:id', checkAuth, requireMaster, async (req, res) => {
  try {
    await CrosswordModel.deleteOne({ _id: req.params.id });
    req.flash('success', 'Jokoa ezabatu dugu');
    res.end();
  } catch (err) {
    logError(err);
    req.flash('danger', 'Erroreren bat izan da');
    res.end();
  }
});

module.exports = router;
