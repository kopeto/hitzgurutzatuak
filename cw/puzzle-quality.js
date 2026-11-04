function isMissingClue(value) {
  const text = String(value || '').trim();
  return !text || /^(?:[-–—]|ninguna pista\.?)$/i.test(text);
}

function missingClues(puzzle) {
  if (puzzle.gameType === 'spiral') {
    const clues = puzzle.spiral?.clues || [];
    if (!clues.length) return [{ number: 1, dir: 'inward', x: 0, y: 0, length: puzzle.width }];
    return clues.flatMap((clue, index) => {
      const match = String(clue).match(/^(\d+)-(\d+)\s*(.*)$/);
      const start = match ? Number(match[1]) : index + 1;
      const end = match ? Number(match[2]) : start;
      return isMissingClue(match ? match[3] : clue) ? [{
        number: start, dir: start > end ? 'outward' : 'inward', x: 0,
        y: Math.min(start, end) - 1, length: Math.abs(end - start) + 1
      }] : [];
    });
  }
  return (puzzle.words || []).flatMap((word, index) => (
    isMissingClue(puzzle.clues?.[index] ?? word.clue) ? [{
      number: word.number, dir: word.dir, x: word.x, y: word.y, length: word.length
    }] : []
  ));
}

function assessPuzzle(puzzle) {
  puzzle.missingClues = missingClues(puzzle);
  puzzle.isComplete = puzzle.missingClues.length === 0;
}

module.exports = { isMissingClue, missingClues, assessPuzzle };
