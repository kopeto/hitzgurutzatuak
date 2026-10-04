// Choose the puzzle catalog list style: 'compact' or 'classic'.
const puzzleListStyle = 'compact';

module.exports = {
  // The catalog style is selected in config/ui.js.
  // compact: a compact list with small puzzle thumbnails and minimal metadata.
  // classic: a classic list with larger puzzle thumbnails and more metadata.
  puzzleListStyle: ['compact', 'classic'].includes(puzzleListStyle) ? puzzleListStyle : 'compact'
};
