# iPuz Format - Quick Start Guide

## For Players

No changes required! Simply:

1. Upload .puz or .ipuz files through the upload interface
2. System automatically detects format
3. Play as normal - all features work identically

## For Developers

### Testing the Parser

```bash
# Test iPuz parser specifically
node test-ipuz.js

# Test entire import service
node test-import.js
```

### Using the Parser Programmatically

```javascript
// Import iPuz parser
const iPuzCrossword = require('./cw/ipuz');

// Parse a file
const puzzle = new iPuzCrossword('./path/to/puzzle.ipuz');

// Access puzzle data
console.log(puzzle.cw_name);        // Title
console.log(puzzle.cw_author);      // Author
console.log(puzzle.width, puzzle.height);  // Dimensions
console.log(puzzle.words);          // Array of words
console.log(puzzle.clues);          // Array of clues
console.log(puzzle.filled_grid);    // Solution grid
console.log(puzzle.void_grid);      // Play grid template
```

### Using the Import Service

```javascript
const { importPuzzle, validateCrossword } = require('./services/puzzle-import');

// Import a puzzle (handles both formats automatically)
try {
  const puzzle = await importPuzzle(uploadedFile);
  console.log(`Imported: ${puzzle.name} (${puzzle.format})`);
} catch (err) {
  console.error('Import failed:', err.message);
}

// Validate puzzle structure
try {
  validateCrossword(parsedPuzzle);
  console.log('Puzzle is valid');
} catch (err) {
  console.error('Validation failed:', err.message);
}
```

### Querying by Format

```javascript
const Crossword = require('./models/crosswords');

// Get all iPuz puzzles
const ipuzOnly = await Crossword.find({ format: 'ipuz' });

// Get all .puz puzzles
const puzOnly = await Crossword.find({ format: 'puz' });

// Get total counts by format
const stats = await Crossword.aggregate([
  { $group: { _id: '$format', count: { $sum: 1 } } }
]);
```

### Format Detection

```javascript
const path = require('path');

function detectFormat(filename) {
  const ext = path.extname(filename).toLowerCase();
  return ext === '.ipuz' ? 'ipuz' : 'puz';
}

// Usage
const format = detectFormat('puzzle.ipuz');  // 'ipuz'
const format = detectFormat('puzzle.puz');   // 'puz'
```

## File Structure

```
Project root
├── cw/
│   ├── crossword.js       (Updated: .puz parser with format field)
│   └── ipuz.js            (NEW: iPuz parser)
├── services/
│   └── puzzle-import.js   (Updated: format detection and routing)
├── routes/
│   └── puzzles.js         (Updated: sends format to client)
├── models/
│   └── crosswords.js      (Updated: added format field to schema)
├── test-ipuz.js           (NEW: iPuz parser tests)
├── test-import.js         (NEW: Import service tests)
├── IPUZ_SUMMARY.md        (NEW: This implementation summary)
├── IPUZ_IMPLEMENTATION.md (NEW: Technical details)
└── docs/
    └── IPUZ_IMPLEMENTATION.md
```

## Known Differences: .puz vs iPuz

| Feature | .puz | iPuz |
|---------|------|------|
| Format | Binary | JSON |
| Single-letter words | NOT counted | Counted |
| Clue grouping | Individual | Can group by row |
| Numbering | Sequential | Sequential |
| Storage | Compact | Verbose (JSON) |

## Troubleshooting

### File Won't Upload
- Check file extension (.puz or .ipuz)
- Verify file is valid format
- Check file size limits

### Parser Error
Run test script:
```bash
node test-ipuz.js
```

Check error message - likely:
- Invalid JSON (if .ipuz)
- Corrupted file
- Missing required fields

### Validation Error
Check puzzle has:
- Valid dimensions (width > 0, height > 0)
- Matching grid sizes
- Words and clues

## Performance Notes

- iPuz parsing is typically faster (JSON native)
- .puz parsing requires binary buffer manipulation
- Both cached in memory during game
- Database queries use format field if filtering needed

## Future Enhancements

Planned features:
- Format conversion utility (puz ↔ ipuz)
- Batch import with format auto-detection
- Format-specific UI rendering
- Statistics dashboard (puzzles by format)

## Questions?

See:
- `docs/IPUZ_IMPLEMENTATION.md` - Technical details
- iPuz spec: http://ipuz.org/
- Test files: `test-ipuz.js`, `test-import.js`
