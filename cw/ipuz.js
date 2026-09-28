const fs = require('fs');

/**
 * iPuz Parser for crossword puzzles
 * Format: JSON-based crossword format (http://ipuz.org/crossword)
 * 
 * Key differences from .puz format:
 * - Single-letter words now count as words (with clues)
 * - Numbering changes: all words in the same row share one clue line (separated by newlines)
 */

class iPuzCrossword {
  constructor(filepath) {
    try {
      const rawData = fs.readFileSync(filepath, 'utf8');
      const data = JSON.parse(rawData);
      
      if (!data.kind || !data.kind[0] || !data.kind[0].includes('crossword')) {
        throw new Error('Not a valid iPuz crossword');
      }

      this.filename = filepath;
      this.format = 'ipuz';
      
      // Extract dimensions
      this.width = data.dimensions?.width || 0;
      this.height = data.dimensions?.height || 0;

      if (!this.width || !this.height) {
        throw new Error('Invalid or missing puzzle dimensions');
      }

      // Extract metadata
      this.cw_name = data.title || data.author || 'Unknown';
      this.cw_author = data.author || 'Unknown';
      this.cw_copyright = data.copyright || 'Unknown';

      // Build grids from puzzle and solution
      this.filled_grid = this._buildFilledGrid(data);
      this.void_grid = this._buildVoidGrid(data);
      this.start_labels = this._buildStartLabels(data);
      
      // Extract clues from ipuz format
      const cluesData = this._extractClues(data);
      
      // Extract and number words with new numbering scheme
      this.words = this._extractWords(this.filled_grid, this.width, this.height, cluesData);
      this.clues = this.words.map(w => w.clue);

    } catch (ex) {
      console.error('Error parsing iPuz:', ex.message);
      throw ex;
    }
  }

  _extractCellValue(cell, key = 'value') {
    if (cell === null || cell === undefined) return null;
    if (typeof cell === 'object') {
      if (Object.prototype.hasOwnProperty.call(cell, key)) return cell[key];
      return null;
    }
    return cell;
  }

  _isBlackValue(value) {
    return value === '#' || value === null || value === undefined;
  }

  _parseStartNumber(raw) {
    if (raw === null || raw === undefined) return null;
    if (typeof raw === 'number' && Number.isInteger(raw) && raw > 0) return raw;
    const text = String(raw).trim();
    if (!text) return null;
    if (!/^\d+$/.test(text)) return null;
    const parsed = Number.parseInt(text, 10);
    return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
  }

  /**
   * Build the filled grid (solution) from ipuz solution data
   */
  _buildFilledGrid(data) {
    const grid = [];
    const solution = data.solution || [];

    for (let i = 0; i < this.height; i++) {
      grid[i] = [];
      for (let j = 0; j < this.width; j++) {
        if (i >= solution.length || j >= solution[i].length) {
          grid[i][j] = '.';
          continue;
        }

        const cell = solution[i][j];
        
        // Handle different cell formats
        if (cell === null || cell === undefined || cell === 0 || cell === '0') {
          grid[i][j] = '.';
        } else if (typeof cell === 'string' && cell === '#') {
          grid[i][j] = '.';
        } else if (typeof cell === 'object' && cell !== null) {
          // Cell with value property
          const value = this._extractCellValue(cell, 'value');
          if (value === null || value === undefined || value === 0 || value === '0') {
            grid[i][j] = '.';
          } else if (value === '#') {
            grid[i][j] = '.';
          } else {
            grid[i][j] = String(value).charAt(0).toUpperCase();
          }
        } else {
          grid[i][j] = String(cell).charAt(0).toUpperCase();
        }
      }
    }

    return grid;
  }

  /**
   * Build the void grid (template) from ipuz puzzle data
   */
  _buildVoidGrid(data) {
    const grid = [];
    const puzzle = data.puzzle || [];
    const emptyToken = data.empty;

    for (let i = 0; i < this.height; i++) {
      grid[i] = [];
      for (let j = 0; j < this.width; j++) {
        if (i >= puzzle.length || j >= puzzle[i].length) {
          grid[i][j] = '.';
          continue;
        }

        const cell = puzzle[i][j];
        
        // Handle different cell formats
        if (cell === null || cell === undefined || cell === 0 || cell === '0' || cell === emptyToken) {
          grid[i][j] = '';
        } else if (typeof cell === 'string' && cell === '#') {
          grid[i][j] = '.';
        } else if (typeof cell === 'object' && cell !== null) {
          // Cell with style or other properties
          const cellValue = this._extractCellValue(cell, 'cell');
          if (cellValue === null || cellValue === undefined || cellValue === 0 || cellValue === '0' || cellValue === emptyToken) {
            grid[i][j] = '';
          } else if (cellValue === '#') {
            grid[i][j] = '.';
          } else {
            grid[i][j] = '';
          }
        } else {
          grid[i][j] = '';
        }
      }
    }

    return grid;
  }

  _buildStartLabels(data) {
    const labels = [];
    const puzzle = data.puzzle || [];
    const solution = data.solution || [];

    for (let i = 0; i < this.height; i++) {
      labels[i] = [];
      for (let j = 0; j < this.width; j++) {
        const puzzleCell = (puzzle[i] && puzzle[i][j] !== undefined) ? puzzle[i][j] : null;
        const solutionCell = (solution[i] && solution[i][j] !== undefined) ? solution[i][j] : null;

        const rawFromPuzzle = typeof puzzleCell === 'object'
          ? this._extractCellValue(puzzleCell, 'cell')
          : puzzleCell;
        const rawFromSolution = typeof solutionCell === 'object'
          ? this._extractCellValue(solutionCell, 'cell')
          : null;

        labels[i][j] = this._parseStartNumber(rawFromPuzzle);
        if (labels[i][j] === null) {
          labels[i][j] = this._parseStartNumber(rawFromSolution);
        }
      }
    }

    return labels;
  }

  _normalizeClueText(text) {
    return this._decodeHtmlEntities(String(text || ''))
      .replace(/\s+/g, ' ')
      .trim();
  }

  _decodeHtmlEntities(text) {
    const namedEntities = {
      amp: '&',
      apos: "'",
      gt: '>',
      lt: '<',
      nbsp: ' ',
      quot: '"'
    };

    return text.replace(/&(?:#(\d+)|#x([\da-f]+)|([a-z][a-z\d]+));/gi, (match, decimal, hexadecimal, name) => {
      if (decimal || hexadecimal) {
        const codePoint = Number.parseInt(decimal || hexadecimal, decimal ? 10 : 16);
        return Number.isInteger(codePoint) && codePoint >= 0 && codePoint <= 0x10ffff
          ? String.fromCodePoint(codePoint)
          : match;
      }
      return namedEntities[name.toLowerCase()] || match;
    });
  }

  _splitGroupedClueText(text) {
    const normalized = String(text || '').replace(/\r/g, '').trim();
    if (!normalized) return [];

    // iPuz clue exports can group multiple definitions with "///" or paragraph breaks.
    return normalized
      .split(/\s*\/\/\/\s*|\n+/)
      .map(part => this._normalizeClueText(part))
      .filter(Boolean);
  }

  /**
   * Extract clues from iPuz clues structure.
   * Keeps clue number so we can map each definition to the word starting cell.
   */
  _extractClues(data) {
    const cluesObj = data.clues || {};

    const entriesForDirection = direction => Object.entries(cluesObj)
      // Some exporters append a localized heading after the direction, e.g.
      // "Across:EZKER-ESKUIN" or "Down:GOITIK BEHERA".
      .filter(([groupName, entries]) => (
        Array.isArray(entries)
        && new RegExp(`^${direction}(?:\\s*:|$)`, 'i').test(String(groupName).trim())
      ))
      .flatMap(([, entries]) => entries.map(c => ({
        number: this._parseStartNumber(c && c.number),
        clue: this._normalizeClueText(c && c.clue)
      })));

    const acrossEntries = entriesForDirection('Across');
    const downEntries = entriesForDirection('Down');

    return {
      acrossEntries,
      downEntries
    };
  }

  _assignCluesByStartCell(words, clueEntries) {
    const cluesByNumber = new Map();
    const fallbackClues = [];

    clueEntries.forEach(entry => {
      const parts = this._splitGroupedClueText(entry.clue);
      if (entry.number !== null && entry.number !== undefined) {
        if (!cluesByNumber.has(entry.number)) cluesByNumber.set(entry.number, []);
        cluesByNumber.get(entry.number).push(...parts);
      } else {
        fallbackClues.push(...parts);
      }
    });

    words.forEach(word => {
      const n = word.number;
      if (n !== null && cluesByNumber.has(n) && cluesByNumber.get(n).length > 0) {
        word.clue = cluesByNumber.get(n).shift();
      } else {
        word.clue = fallbackClues.shift() || '';
      }
    });
  }

  /**
   * Extract words and map them to clue numbers from start cells.
   * - Includes single-letter words
   * - Uses clue/start-cell numbers when present
   */
  _extractWords(grid, w, h, cluesData) {
    const acrossWords = [];
    const downWords = [];
    let fallbackAcrossNumber = 1;
    let fallbackDownNumber = 1;
    let wordIndex = 0;

    // Across extraction in row-major order (row by row, left to right).
    for (let i = 0; i < h; i++) {
      for (let j = 0; j < w; j++) {
        if (grid[i][j] === '.') continue;

        const startsAcross = (j === 0 || grid[i][j - 1] === '.');
        if (!startsAcross) continue;

        let word = '';
        let index = j;
        while (index < w && grid[i][index] !== '.') {
          word += grid[i][index];
          index++;
        }

        const startNumber = this.start_labels?.[i]?.[j] ?? null;

        acrossWords.push({
          word,
          dir: 'right',
          x: i,
          y: j,
          length: index - j,
          number: startNumber !== null ? startNumber : fallbackAcrossNumber++,
          index: wordIndex++,
          clue: ''
        });
      }
    }

    // Down extraction in column-major order (column by column, top to bottom)
    // to align with column-based clue grouping.
    for (let j = 0; j < w; j++) {
      for (let i = 0; i < h; i++) {
        if (grid[i][j] === '.') continue;

        const startsDown = (i === 0 || grid[i - 1][j] === '.');
        if (!startsDown) continue;

        let word = '';
        let index = i;
        while (index < h && grid[index][j] !== '.') {
          word += grid[index][j];
          index++;
        }

        const startNumber = this.start_labels?.[i]?.[j] ?? null;

        downWords.push({
          word,
          dir: 'down',
          x: i,
          y: j,
          length: index - i,
          number: startNumber !== null ? startNumber : fallbackDownNumber++,
          index: wordIndex++,
          clue: ''
        });
      }
    }

    this._assignCluesByStartCell(acrossWords, cluesData.acrossEntries || []);
    this._assignCluesByStartCell(downWords, cluesData.downEntries || []);

    return [...acrossWords, ...downWords];
  }

  print_grid() {
    for (let i = 0; i < this.height; i++) {
      for (let j = 0; j < this.width; j++) {
        process.stdout.write(this.filled_grid[i][j]);
      }
      console.log();
    }
  }

  print_words_and_clues() {
    for (let i = 0; i < this.words.length; i++) {
      console.log(`[${i}] ${this.words[i].word} - ${this.words[i].clue}`);
    }
  }

  print_info() {
    console.log('Name: ' + this.cw_name);
    console.log('Author: ' + this.cw_author);
    console.log('Copyright: ' + this.cw_copyright);
    console.log('Format: ' + this.format);
  }
}

module.exports = iPuzCrossword;
