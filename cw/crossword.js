const fs = require('fs');
const path = require('path');
const IPuzReader = require('./ipuz-reader');

function readNullTerminatedString(buffer, offset) {
  const end = buffer.indexOf(0, offset);
  if (end === -1) throw new Error('.puz fitxategiak amaitu gabeko testu eremu bat du.');
  return { value: buffer.toString('latin1', offset, end), nextOffset: end + 1 };
}

function readGrid(buffer, offset, width, height) {
  if (offset + width * height > buffer.length) {
    throw new Error('.puz fitxategiko taula osatu gabe dago.');
  }

  return Array.from({ length: height }, (_, row) =>
    Array.from(buffer.subarray(offset + row * width, offset + (row + 1) * width), byte => String.fromCharCode(byte))
  );
}

function wordsFromPuzGrid(grid, clues) {
  const height = grid.length;
  const width = height ? grid[0].length : 0;
  const words = [];
  let number = 0;

  for (let row = 0; row < height; row++) {
    for (let col = 0; col < width; col++) {
      if (grid[row][col] === '.') continue;

      const startsAcross = (col === 0 || grid[row][col - 1] === '.')
        && col + 1 < width && grid[row][col + 1] !== '.';
      const startsDown = (row === 0 || grid[row - 1][col] === '.')
        && row + 1 < height && grid[row + 1][col] !== '.';
      if (!startsAcross && !startsDown) continue;

      number++;
      if (startsAcross) {
        let end = col;
        while (end < width && grid[row][end] !== '.') end++;
        words.push({
          word: grid[row].slice(col, end).join(''),
          dir: 'right', x: row, y: col, length: end - col, number,
          clue: clues[words.length] || ''
        });
      }
      if (startsDown) {
        let end = row;
        while (end < height && grid[end][col] !== '.') end++;
        words.push({
          word: grid.slice(row, end).map(line => line[col]).join(''),
          dir: 'down', x: row, y: col, length: end - row, number,
          clue: clues[words.length] || ''
        });
      }
    }
  }
  return words;
}

/** Shared crossword representation and entry point for .puz and .ipuz files. */
class Crossword {
  constructor(filepath, sourceFormat) {
    const format = sourceFormat || this._detectFormat(filepath);
    this.filename = filepath;

    if (format === 'ipuz') {
      Object.assign(this, new IPuzReader(filepath));
    } else if (format === 'puz') {
      this._readPuz(filepath);
    } else {
      throw new Error(`Hitz gurutzatuaren formatu hau ez da onartzen: ${format}`);
    }

    this.gameType = 'crossword';
    this._normalizeStructure();
  }

  _detectFormat(filepath) {
    const extension = path.extname(filepath).toLowerCase();
    if (extension === '.ipuz') return 'ipuz';
    if (extension === '.puz') return 'puz';

    const firstCharacter = fs.readFileSync(filepath, 'utf8').trimStart()[0];
    return firstCharacter === '{' ? 'ipuz' : 'puz';
  }

  _readPuz(filepath) {
    const buffer = fs.readFileSync(filepath);
    if (buffer.length < 0x34) throw new Error('.puz fitxategiaren goiburua osatu gabe dago.');

    this.format = 'puz';
    this.width = buffer.readUInt8(0x2c);
    this.height = buffer.readUInt8(0x2d);
    if (!this.width || !this.height) throw new Error('.puz fitxategiak ez ditu taularen neurriak zehazten.');

    const gridStart = 0x34;
    const gridSize = this.width * this.height;
    this.filled_grid = readGrid(buffer, gridStart, this.width, this.height);
    this.void_grid = readGrid(buffer, gridStart + gridSize, this.width, this.height);

    const title = readNullTerminatedString(buffer, gridStart + gridSize * 2);
    const author = readNullTerminatedString(buffer, title.nextOffset);
    const copyright = readNullTerminatedString(buffer, author.nextOffset);
    this.cw_name = title.value || 'Izengabea';
    this.cw_author = author.value || 'Egile ezezaguna';
    this.cw_copyright = copyright.value || 'Ezezaguna';

    const clues = [];
    let offset = copyright.nextOffset;
    while (offset < buffer.length) {
      const clue = readNullTerminatedString(buffer, offset);
      if (clue.value) clues.push(clue.value);
      offset = clue.nextOffset;
    }

    this.words = wordsFromPuzGrid(this.filled_grid, clues);
    this.clues = this.words.map(word => word.clue);
  }

  _normalizeStructure() {
    this.cw_name = this.cw_name || 'Izengabea';
    this.cw_author = this.cw_author || 'Egile ezezaguna';
    this.cw_copyright = this.cw_copyright || 'Ezezaguna';

    const directionOrder = { right: 0, down: 1 };
    this.words = (Array.isArray(this.words) ? this.words : [])
      .map(word => ({
        word: String(word.word || ''),
        dir: word.dir,
        x: Number(word.x),
        y: Number(word.y),
        length: Number(word.length),
        number: Number(word.number),
        index: 0,
        clue: String(word.clue || '')
      }))
      .sort((a, b) => a.x - b.x || a.y - b.y || directionOrder[a.dir] - directionOrder[b.dir])
      .map((word, index) => ({ ...word, index }));

    this.clues = this.words.map(word => word.clue);
    if (!Array.isArray(this.start_labels)) {
      this.start_labels = Array.from({ length: this.height }, () => Array(this.width).fill(null));
    }
  }

  print_grid() {
    this.filled_grid.forEach(row => console.log(row.join('')));
  }

  print_words_and_clues() {
    this.words.forEach((word, index) => console.log(`[${index}] ${word.word} - ${word.clue}`));
  }

  print_info() {
    console.log('Name: ' + this.cw_name);
    console.log('Author: ' + this.cw_author);
    console.log('Copyright: ' + this.cw_copyright);
    console.log('Format: ' + this.format);
  }
}

module.exports = Crossword;
