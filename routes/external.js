/**
 * External API routes — closed, protected by API key.
 *
 * POST /external/puzzle
 *   Upload a .puz file and add it to the system.
 *   Header: Authorization: Bearer <EXTERNAL_API_KEY>
 *   Body:   multipart/form-data  field "filename" → .puz file
 *
 * GET /external/puzzles
 *   List all puzzles (id, name, author, width, height).
 *   Header: Authorization: Bearer <EXTERNAL_API_KEY>
 *
 * DELETE /external/puzzle/:id
 *   Delete a puzzle by id.
 *   Header: Authorization: Bearer <EXTERNAL_API_KEY>
 */

const express = require('express');
const router = express.Router();
const path = require('path');
const rateLimit = require('express-rate-limit');

const requireApiKey = require('../auth/apikey');
const upload = require('../config/uploadconfig');
const Crossword = require('../cw/crossword');
const CrosswordModel = require('../models/crosswords');
const { logError, logInfo } = require('../utils');

// Max 30 requests per minute per IP
const externalLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: true, message: 'Eskaera gehiegi. Saiatu berriro minutu baten buruan.' }
});

// Apply rate limit + API key to all routes in this file
router.use(externalLimiter);
router.use(requireApiKey);

// ---------------------------------------------------------------------------
// POST /external/puzzle  — upload a .puz file
// ---------------------------------------------------------------------------
router.post('/puzzle', upload.single('filename'), async (req, res) => {
  // uploadconfig sets req.uploadErrors if file is not .puz
  if (req.uploadErrors) {
    return res.status(400).json({
      error: true,
      message: req.uploadErrors.map(e => e.message).join(', ')
    });
  }

  if (!req.file) {
    return res.status(400).json({ error: true, message: 'Ez da fitxategirik jaso. Erabili "filename" eremua.' });
  }

  try {
    const filePath = path.join(__dirname, '../uploads', req.file.originalname);
    const crossword = new Crossword(filePath);

    const cw = new CrosswordModel();
    cw.filename    = req.file.originalname;
    cw.width       = crossword.width;
    cw.height      = crossword.height;
    cw.words       = crossword.words;
    cw.clues       = crossword.clues;
    cw.void_grid   = crossword.void_grid;
    cw.filled_grid = crossword.filled_grid;
    cw.name        = crossword.cw_name  === 'Unknown' ? 'Izengabea'    : crossword.cw_name;
    cw.author      = crossword.cw_author === 'Unknown' ? 'Joxan Elosegi' : crossword.cw_author;

    await cw.save();
    logInfo(`[external API] Puzzle berria kargatu da: ${cw.filename}`);

    return res.status(201).json({
      error: false,
      message: 'Puzlea arrakastaz kargatu da.',
      puzzle: {
        id:     cw._id,
        name:   cw.name,
        author: cw.author,
        width:  cw.width,
        height: cw.height
      }
    });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({ error: true, message: 'Puzle hau dagoeneko badago sisteman.' });
    }
    logError(err);
    return res.status(500).json({ error: true, message: 'Zerbitzari errorea.' });
  }
});

// ---------------------------------------------------------------------------
// GET /external/puzzles  — list all puzzles
// ---------------------------------------------------------------------------
router.get('/puzzles', async (req, res) => {
  try {
    const puzzles = await CrosswordModel.find({}, 'filename name author width height createdAt');
    return res.json({ error: false, puzzles });
  } catch (err) {
    logError(err);
    return res.status(500).json({ error: true, message: 'Zerbitzari errorea.' });
  }
});

// ---------------------------------------------------------------------------
// DELETE /external/puzzle/:id  — delete a puzzle by id
// ---------------------------------------------------------------------------
router.delete('/puzzle/:id', async (req, res) => {
  try {
    const result = await CrosswordModel.deleteOne({ _id: req.params.id });
    if (result.deletedCount === 0) {
      return res.status(404).json({ error: true, message: 'Puzlea ez da aurkitu.' });
    }
    return res.json({ error: false, message: 'Puzlea ezabatu da.' });
  } catch (err) {
    logError(err);
    return res.status(500).json({ error: true, message: 'Zerbitzari errorea.' });
  }
});

module.exports = router;
