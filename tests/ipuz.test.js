const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');

const Crossword = require('../cw/crossword');

function readPuzzle(t, overrides = {}) {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'crossword-ipuz-'));
  t.after(() => fs.rmSync(directory, { recursive: true, force: true }));
  const filename = path.join(directory, 'puzzle.ipuz');
  fs.writeFileSync(filename, JSON.stringify({
    kind: ['http://ipuz.org/crossword#1'],
    dimensions: { width: 3, height: 3 },
    puzzle: [[0, 0, 0], ['#', 0, 0], [0, 0, '#']],
    solution: [
      [{ value: 'A', cell: 0 }, { value: 'B', cell: 0 }, { value: 'C', cell: 0 }],
      ['#', { value: 'D', cell: 0 }, { value: 'E', cell: 0 }],
      [{ value: 'F', cell: 0 }, { value: 'G', cell: 0 }, '#']
    ],
    ...overrides
  }));
  return new Crossword(filename);
}

function wordClues(puzzle, direction) {
  return puzzle.words.filter(word => word.dir === direction)
    .map(({ word, x, y, clue }) => ({ word, x, y, clue }));
}

test('iPuz unnumbered clues follow start cells in row order in both directions', t => {
  const puzzle = readPuzzle(t, {
    clues: {
      Across: ['ABC', 'DE', 'FG'].map(word => ({ number: '', clue: `Across ${word}` })),
      Down: ['A', 'BDG', 'CE', 'F'].map(word => ({ number: '', clue: `Down ${word}` }))
    }
  });

  assert.deepEqual(wordClues(puzzle, 'right'), [
    { word: 'ABC', x: 0, y: 0, clue: 'Across ABC' },
    { word: 'DE', x: 1, y: 1, clue: 'Across DE' },
    { word: 'FG', x: 2, y: 0, clue: 'Across FG' }
  ]);
  assert.deepEqual(wordClues(puzzle, 'down'), [
    { word: 'A', x: 0, y: 0, clue: 'Down A' },
    { word: 'BDG', x: 0, y: 1, clue: 'Down BDG' },
    { word: 'CE', x: 0, y: 2, clue: 'Down CE' },
    { word: 'F', x: 2, y: 0, clue: 'Down F' }
  ]);
  assert.deepEqual(puzzle.clues, puzzle.words.map(word => word.clue));
  assert.deepEqual(puzzle.words.map(word => word.index), [0, 1, 2, 3, 4, 5, 6]);
});

test('iPuz numbered clues use source labels regardless of clue list order', t => {
  const puzzle = readPuzzle(t, {
    puzzle: [[10, 20, 30], ['#', 40, 0], [50, 0, '#']],
    clues: {
      'Across:EZKER-ESKUIN': [
        { number: 50, clue: 'Across FG' },
        { number: 10, clue: 'Across ABC' },
        { number: 40, clue: 'Across DE' }
      ],
      'Down:GOITIK BEHERA': [
        { number: 50, clue: 'Down F' },
        { number: 30, clue: 'Down CE' },
        { number: 10, clue: 'Down A' },
        { number: '20', clue: 'Down BDG' }
      ]
    }
  });

  for (const word of puzzle.words) {
    assert.equal(word.clue, `${word.dir === 'right' ? 'Across' : 'Down'} ${word.word}`);
  }
  assert.deepEqual(puzzle.words.map(word => word.number), [1, 1, 2, 3, 4, 5, 5]);
});

test('iPuz mixed clues reserve numbered entries and assign the rest in row order', t => {
  const puzzle = readPuzzle(t, {
    puzzle: [[1, 2, 3], ['#', 4, 0], [5, 0, '#']],
    clues: {
      Across: [
        { number: 4, clue: 'Across DE' },
        { clue: 'Across ABC' },
        { clue: 'Across FG' }
      ],
      Down: [
        { number: 2, clue: 'Down BDG' },
        { clue: 'Down A' },
        { clue: 'Down CE' },
        { clue: 'Down F' }
      ]
    }
  });

  for (const word of puzzle.words) {
    assert.equal(word.clue, `${word.dir === 'right' ? 'Across' : 'Down'} ${word.word}`);
  }
});
