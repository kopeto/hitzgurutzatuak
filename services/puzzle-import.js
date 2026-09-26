const crypto = require('crypto');
const fs = require('fs/promises');
const path = require('path');

const Crossword = require('../cw/crossword');
const iPuzCrossword = require('../cw/ipuz');
const SpiralPuzzle = require('../cw/spiral');
const CrosswordModel = require('../models/crosswords');

class PuzzleImportError extends Error {
  constructor(message, statusCode = 400) {
    super(message);
    this.name = 'PuzzleImportError';
    this.statusCode = statusCode;
  }
}

function isGridValid(grid, width, height) {
  return Array.isArray(grid)
    && grid.length === height
    && grid.every(row => Array.isArray(row) && row.length === width);
}

function validateCrossword(crossword) {
  const width = crossword && crossword.width;
  const height = crossword && crossword.height;

  if (!Number.isInteger(width) || !Number.isInteger(height) || width < 1 || height < 1) {
    throw new PuzzleImportError('Puzle fitxategiak ez du baliozko taularik.');
  }

  if (!isGridValid(crossword.filled_grid, width, height) || !isGridValid(crossword.void_grid, width, height)) {
    throw new PuzzleImportError('Puzle fitxategiko taula ez da baliozkoa.');
  }

  if (!Array.isArray(crossword.words) || !Array.isArray(crossword.clues) || crossword.words.length === 0) {
    throw new PuzzleImportError('Puzle fitxategiak ez du hitz edo pistarik.');
  }
}

function normalizedMetadata(value, fallback, maxLength) {
  const text = String(value || '').trim();
  if (!text || text === 'Unknown') return fallback;
  return text.slice(0, maxLength);
}

async function removeTemporaryFile(filePath) {
  if (!filePath) return;

  try {
    await fs.unlink(filePath);
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
  }
}

/**
 * Detect file format based on extension
 * Returns 'puz', 'ipuz' or 'spl'
 */
function detectFormat(filename) {
  const ext = path.extname(filename).toLowerCase();
  if (ext === '.ipuz') {
    return 'ipuz';
  }
  if (ext === '.spl') {
    return 'spl';
  }
  return 'puz';
}

async function importPuzzle(uploadedFile) {
  if (!uploadedFile || !uploadedFile.path) {
    throw new PuzzleImportError('Ez da fitxategirik jaso.');
  }

  try {
    const content = await fs.readFile(uploadedFile.path);
    const fileHash = crypto.createHash('sha256').update(content).digest('hex');
    const existingPuzzle = await CrosswordModel.findOne({ fileHash }).select('_id').lean();

    if (existingPuzzle) {
      throw new PuzzleImportError('Puzle hau dagoeneko sisteman dago.', 409);
    }

    // Detect format and parse accordingly
    const format = detectFormat(uploadedFile.originalname);
    let crossword;

    if (format === 'ipuz') {
      crossword = new iPuzCrossword(uploadedFile.path);
    } else if (format === 'spl') {
      crossword = new SpiralPuzzle(uploadedFile.path);
    } else {
      crossword = new Crossword(uploadedFile.path);
    }

    validateCrossword(crossword);

    const puzzle = new CrosswordModel({
      filename: normalizedMetadata(uploadedFile.originalname, 'puzlea.puz', 180),
      width: crossword.width,
      height: crossword.height,
      words: crossword.words,
      clues: crossword.clues,
      void_grid: crossword.void_grid,
      filled_grid: crossword.filled_grid,
      name: normalizedMetadata(crossword.cw_name, 'Izengabea', 200),
      author: normalizedMetadata(crossword.cw_author, 'Ezezaguna', 120),
      gameType: crossword.gameType || 'crossword',
      format: format,
      spiral: crossword.spiral || null,
      fileHash
    });

    await puzzle.save();
    return puzzle;
  } finally {
    await removeTemporaryFile(uploadedFile.path);
  }
}

module.exports = {
  PuzzleImportError,
  importPuzzle,
  validateCrossword
};
