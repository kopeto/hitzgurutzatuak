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

function normalizeDefinitions(direction, rawDefs, cellCount, options = {}) {
  const defs = Array.isArray(rawDefs) ? rawDefs : [];
  const totalCells = Math.max(1, Number.parseInt(cellCount, 10) || 1);
  const editedIndex = Number.isInteger(options.editedIndex) ? options.editedIndex : -1;
  const editedField = options.editedField === 'start' || options.editedField === 'end' ? options.editedField : '';

  if (!defs.length) return [];

  const normalized = defs.map(raw => {
    const start = Math.max(1, Math.min(totalCells, Number.parseInt(raw && raw.start, 10) || 1));
    const end = Math.max(1, Math.min(totalCells, Number.parseInt(raw && raw.end, 10) || start));
    return {
      start: Math.min(start, end),
      end: Math.max(start, end),
      text: String(raw && raw.text ? raw.text : '').trim()
    };
  }).sort((a, b) => a.start - b.start);

  // Forward pass: handle overlaps by reducing previous end
  for (let i = 1; i < normalized.length; i += 1) {
    const previous = normalized[i - 1];
    const current = normalized[i];

    if (current.start < previous.end + 1) {
      const editedPreviousEnd = editedField === 'end' && editedIndex === (i - 1);

      if (editedPreviousEnd) {
        const desiredNextStart = previous.end + 1;
        current.start = Math.max(1, Math.min(totalCells, previous.end + 1));
        if (current.start > current.end) {
          current.end = current.start;
        }

        if (current.start < desiredNextStart) {
          previous.end = Math.max(previous.start, current.start - 1);
        }
      } else {
        previous.end = Math.max(previous.start, current.start - 1);
      }
    }
  }

  // Backward pass: handle overlaps by increasing next start
  for (let i = normalized.length - 2; i >= 0; i -= 1) {
    const current = normalized[i];
    const next = normalized[i + 1];

    if (current.end > next.start - 1) {
      next.start = Math.min(totalCells, current.end + 1);
      if (next.start > next.end) {
        next.end = next.start;
      }
    }
  }

  // Fill gaps: pull the previous end to meet the next start
  for (let i = 1; i < normalized.length; i += 1) {
    const previous = normalized[i - 1];
    const current = normalized[i];

    if (previous.end < current.start - 1) {
      const editedPreviousEnd = editedField === 'end' && editedIndex === (i - 1);

      if (editedPreviousEnd) {
        current.start = Math.max(1, Math.min(totalCells, previous.end + 1));
        if (current.start > current.end) {
          current.end = current.start;
        }
      } else {
        previous.end = current.start - 1;
      }
    }
  }

  const first = normalized[0];
  if (first) {
    first.start = 1;
    if (first.end < first.start) {
      first.end = first.start;
    }
  }

  const last = normalized[normalized.length - 1];
  if (last) {
    last.end = totalCells;
    if (last.start > last.end) {
      last.start = last.end;
    }
  }

  return normalized.filter(item => item.start >= 1 && item.start <= totalCells && item.end >= 1 && item.end <= totalCells);
}


function cellsCovered(defs, cellCount) {
  const covered = new Set();

  defs.forEach(({ start, end }) => {
    for (let i = Math.min(start, end); i <= Math.max(start, end); i += 1) {
      covered.add(i);
    }
  });

  return covered.size === cellCount && Array.from({ length: cellCount }, (_, index) => index + 1).every(value => covered.has(value));
}

test('Definizioen tarteak ez dute gainjartzen eta azpimarratu gabeko laukirik utzi behar dute', () => {
  const defs = normalizeDefinitions('inward', [
    { start: 1, end: 3 },
    { start: 2, end: 6 },
    { start: 7, end: 10 }
  ], 10);

  assert.ok(defs.every(item => item.start <= item.end));
  assert.ok(defs.every(item => item.start >= 1 && item.end <= 10));
  assert.ok(cellsCovered(defs, 10));
  for (let i = 1; i < defs.length; i += 1) {
    assert.ok(defs[i - 1].end < defs[i].start);
  }
});

test('Inward definizioen hurrengoa ez da jarri azken laukitik haratago eta ez da azpian 1 casillara jaitsi', () => {
  const defs = normalizeDefinitions('inward', [
    { start: 1, end: 8 },
    { start: 9, end: 12 },
    { start: 13, end: 20 }
  ], 10);

  assert.ok(defs.every(item => item.start >= 1 && item.end <= 10));
  assert.ok(defs.every(item => item.start <= item.end));
  assert.ok(cellsCovered(defs, 10));
  assert.ok(defs[defs.length - 1].end <= 10);
});

test('Outward definizioak ere tarte jarraituak eta kapsulatuak izan behar dira', () => {
  const defs = normalizeDefinitions('outward', [
    { start: 10, end: 8 },
    { start: 7, end: 5 },
    { start: 4, end: 1 }
  ], 10);

  assert.ok(defs.every(item => item.start <= item.end));
  assert.ok(defs.every(item => item.start >= 1 && item.end <= 10));
  assert.ok(cellsCovered(defs, 10));
});

test('Amaiera txikitzean, hurrengo definizioaren hasiera arrastatu behar da', () => {
  const defs = normalizeDefinitions('inward', [
    { start: 1, end: 2 },
    { start: 3, end: 6 },
    { start: 9, end: 10 }
  ], 10, { editedIndex: 1, editedField: 'end' });

  assert.strictEqual(defs[1].end, 6);
  assert.strictEqual(defs[2].start, 7);
  assert.ok(cellsCovered(defs, 10));
});

test('Amaiera handitzean, hurrengo definizioaren hasiera aurrera bultzatu behar da', () => {
  const defs = normalizeDefinitions('inward', [
    { start: 1, end: 2 },
    { start: 3, end: 8 },
    { start: 9, end: 10 }
  ], 10, { editedIndex: 1, editedField: 'end' });

  // Simulate user increasing end on the second definition to force overlap.
  defs[1].end = 9;
  const renormalized = normalizeDefinitions('inward', defs, 10, { editedIndex: 1, editedField: 'end' });

  assert.strictEqual(renormalized[1].end, 9);
  assert.strictEqual(renormalized[2].start, 10);
  assert.ok(cellsCovered(renormalized, 10));
});

test('Outward-en ere amaiera handitzean, hurrengo definizioaren hasiera bultzatu behar da', () => {
  const defs = normalizeDefinitions('outward', [
    { start: 4, end: 1 },
    { start: 7, end: 5 },
    { start: 10, end: 8 }
  ], 10);

  defs[1].end = 8;
  const renormalized = normalizeDefinitions('outward', defs, 10, { editedIndex: 1, editedField: 'end' });

  assert.strictEqual(renormalized[1].end, 8);
  assert.strictEqual(renormalized[2].start, 9);
  assert.ok(cellsCovered(renormalized, 10));
});

test('Outward sarrera desordenatuan ez dira casilla berdinak errepikatu behar', () => {
  const defs = normalizeDefinitions('outward', [
    { start: 10, end: 8 },
    { start: 4, end: 1 },
    { start: 7, end: 5 }
  ], 10);

  const covered = new Set();
  defs.forEach(({ start, end }) => {
    for (let i = start; i <= end; i += 1) {
      assert.ok(!covered.has(i));
      covered.add(i);
    }
  });

  assert.ok(cellsCovered(defs, 10));
});

test('Outward-en mugan ezin bada bultzatu, aurreko definizioa moztu behar da gainjartzea saihesteko', () => {
  const defs = normalizeDefinitions('outward', [
    { start: 1, end: 64 },
    { start: 64, end: 64 }
  ], 64, { editedIndex: 0, editedField: 'end' });

  const covered = new Set();
  defs.forEach(({ start, end }) => {
    for (let i = start; i <= end; i += 1) {
      assert.ok(!covered.has(i));
      covered.add(i);
    }
  });
});

test('Eskuz aldatuta ere outward-ek 1etik hasi eta azken casillaraino estali behar du', () => {
  const defs = normalizeDefinitions('outward', [
    { start: 61, end: 64 },
    { start: 57, end: 60 },
    { start: 49, end: 56 },
    { start: 33, end: 48 },
    { start: 3, end: 32 }
  ], 64);

  assert.strictEqual(defs[0].start, 1);
  assert.strictEqual(defs[defs.length - 1].end, 64);
  assert.ok(cellsCovered(defs, 64));
});
