const assert = require('node:assert/strict');
const test = require('node:test');

const sessionConfig = require('../config/sessionconfig');
const uploadPuzzle = require('../config/uploadconfig');
const User = require('../models/user');
const Crossword = require('../models/crosswords');
const { PuzzleImportError, validateCrossword } = require('../services/puzzle-import');

test('Saioaren konfigurazioak cookie seguruak erabiltzen ditu', () => {
  assert.equal(sessionConfig.resave, false);
  assert.equal(sessionConfig.saveUninitialized, false);
  assert.equal(sessionConfig.cookie.httpOnly, true);
  assert.equal(sessionConfig.cookie.sameSite, 'lax');
  assert.ok(sessionConfig.cookie.maxAge > 0);
});

test('Erabiltzaile berriek ez dute master baimenik lehenespenez', () => {
  assert.equal(User.schema.path('master').defaultValue, false);
  assert.equal(User.schema.path('username').options.unique, true);
  assert.equal(User.schema.path('email').options.unique, true);
});

test('Puzle eskemak spl formatua eta spiral mota onartzen ditu', () => {
  assert.ok(Crossword.schema.path('format').enumValues.includes('spl'));
  assert.ok(Crossword.schema.path('gameType').enumValues.includes('spiral'));
});

test('Kargaren fitxategi-izena segurtasunez normalizatzen da', () => {
  assert.equal(uploadPuzzle.sanitizeOriginalFilename('../../ez-baimendua.puz'), 'ez-baimendua.puz');
  assert.equal(uploadPuzzle.sanitizeOriginalFilename(''), 'puzlea.puz');
  assert.equal(uploadPuzzle.sanitizeOriginalFilename('puzle<>.puz'), 'puzle__.puz');
});

test('Baliozko .puz datu egitura onartzen da', () => {
  const crossword = {
    width: 2,
    height: 2,
    filled_grid: [['A', 'B'], ['C', 'D']],
    void_grid: [['-', '-'], ['-', '-']],
    words: [{ word: 'AB' }],
    clues: ['Proba']
  };

  assert.doesNotThrow(() => validateCrossword(crossword));
});

test('Puzle egitura baliogabea baztertzen da', () => {
  assert.throws(
    () => validateCrossword({ width: 2, height: 2, filled_grid: [], void_grid: [], words: [], clues: [] }),
    PuzzleImportError
  );
});

function preserveDefinitions(rawDefs) {
  return (Array.isArray(rawDefs) ? rawDefs : []).map(definition => ({
    start: definition.start ?? 1,
    end: definition.end ?? 1,
    text: String(definition.text || '')
  }));
}

function createDefinition(cellCount) {
  return { start: 1, end: cellCount, text: '' };
}

test('Definizioek erabiltzaileak emandako tartea eta ordena mantentzen dituzte', () => {
  const definitions = preserveDefinitions([
    { start: 9, end: 2, text: 'Lehenengoa' },
    { start: 2, end: 6, text: 'Gainjartzea' },
    { start: 20, end: 25, text: 'Hutsunea' }
  ]);

  assert.deepEqual(definitions, [
    { start: 9, end: 2, text: 'Lehenengoa' },
    { start: 2, end: 6, text: 'Gainjartzea' },
    { start: 20, end: 25, text: 'Hutsunea' }
  ]);
});

test('Definizio berria espiralaren tarte osoarekin hasten da', () => {
  assert.deepEqual(createDefinition(64), { start: 1, end: 64, text: '' });
});

test('Definizio hutsen zerrenda hutsik mantentzen da', () => {
  assert.deepEqual(preserveDefinitions([]), []);
});
