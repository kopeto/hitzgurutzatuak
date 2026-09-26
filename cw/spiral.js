const fs = require('fs');

class SpiralPuzzle {
  constructor(filepath) {
    const rawData = fs.readFileSync(filepath, 'utf8');
    const data = JSON.parse(rawData);

    if (!data || (data.format !== 'spl' && data.kind !== 'hitzgurutzatuak/spiral/v1')) {
      throw new Error('Not a valid SPL spiral puzzle');
    }

    const cells = Array.isArray(data.cells) ? data.cells : [];
    if (cells.length === 0) {
      throw new Error('SPL puzzle has no cells');
    }

    const normalizedCells = cells
      .map(cell => ({
        index: Number.parseInt(cell.index, 10),
        path: String(cell.path || '').trim(),
        x: Number(cell.x),
        y: Number(cell.y),
        labelX: cell.labelX !== undefined ? Number(cell.labelX) : null,
        labelY: cell.labelY !== undefined ? Number(cell.labelY) : null
      }))
      .filter(cell => Number.isInteger(cell.index) && cell.index > 0 && cell.path);

    normalizedCells.sort((a, b) => a.index - b.index);

    if (normalizedCells.length !== cells.length) {
      throw new Error('SPL puzzle has invalid cells');
    }

    const answer = String(data.answer || '').trim().toUpperCase();
    if (!answer) {
      throw new Error('SPL puzzle has no answer');
    }

    if (answer.length !== normalizedCells.length) {
      throw new Error('SPL answer length must match number of cells');
    }

    const clues = Array.isArray(data.clues)
      ? data.clues.map(c => String(c || '').trim()).filter(Boolean)
      : [];

    this.filename = filepath;
    this.format = 'spl';
    this.gameType = 'spiral';
    this.width = normalizedCells.length;
    this.height = 1;

    this.cw_name = String(data.title || 'Izengabea').trim() || 'Izengabea';
    this.cw_author = String(data.author || 'Ezezaguna').trim() || 'Ezezaguna';

    const letters = Array.from(answer);
    this.filled_grid = [letters];
    this.void_grid = [Array.from({ length: letters.length }, () => '')];

    this.words = [{
      word: answer,
      dir: 'right',
      x: 0,
      y: 0,
      length: letters.length,
      number: 1,
      clue: clues[0] || 'Espiral erantzuna'
    }];

    this.clues = [this.words[0].clue];
    this.spiral = {
      viewBox: String(data.viewBox || '0 0 700 700'),
      cellCount: normalizedCells.length,
      cells: normalizedCells,
      clues,
      answerLength: letters.length
    };
  }
}

module.exports = SpiralPuzzle;
