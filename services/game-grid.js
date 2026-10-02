function createEmptyGrid(voidGrid) {
  return voidGrid.map(row => row.map(cell => (cell === '.' ? '.' : '')));
}

module.exports = { createEmptyGrid };
