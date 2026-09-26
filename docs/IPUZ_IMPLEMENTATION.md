# iPuz Format Support Implementation

## Overview
Implemented full support for the iPuz crossword format (http://ipuz.org/crossword) alongside existing .puz format support.

## Key Changes

### 1. New iPuz Parser (`cw/ipuz.js`)
- Reads JSON-based iPuz crossword format
- Extracts grids, clues, and solutions from iPuz structure
- **Important Change**: Single-letter words now count as valid words with clues
- Handles iPuz clue numbering (sequential based on cell position)

### 2. Extended Data Model (`models/crosswords.js`)
Added new field to track puzzle format:
```javascript
format: {
  type: String,
  enum: ['puz', 'ipuz'],
  default: 'puz'
}
```

### 3. Updated Import Service (`services/puzzle-import.js`)
- Auto-detects file format based on extension (.puz vs .ipuz)
- Routes to appropriate parser
- Stores format information in database

### 4. Enhanced Routes (`routes/puzzles.js`)
- Sends format information to client
- Allows frontend to render puzzles appropriately

### 5. Updated .puz Parser (`cw/crossword.js`)
- Added format field to maintain consistency

## Puzzle Format Differences

### .puz (Original Format)
- Binary format
- Standard crossword numbering
- Single-letter words are NOT counted as separate words
- Each word has individual clue assignments

### iPuz (New Format)  
- JSON-based format
- Standard crossword numbering
- Single-letter words ARE counted as separate words with clues
- Clues can be visually grouped by row (all across clues on same row in one line, separated by newlines)

## Word Numbering

Both formats follow standard crossword numbering:
- Numbers are assigned sequentially left-to-right, top-to-bottom
- A cell gets a number if it starts an Across OR Down word
- For single-letter words: a letter can be a complete word if:
  - No letter to the left/above (starts a word)
  - AND no letter to the right/below (ends immediately, making it single letter)

## Data Structure

Words maintain consistent structure across both formats:
```javascript
{
  word: String,        // The answer letters
  dir: String,         // 'right' (across) or 'down'
  x: Number,           // Row coordinate
  y: Number,           // Column coordinate  
  length: Number,      // Number of letters
  number: Number,      // Cell numbering for clues
  clue: String,        // The clue text
  index: Number        // Internal word ordering
}
```

## Backend Integration

### File Upload Detection
```javascript
const format = detectFormat(uploadedFile.originalname);
// Returns 'ipuz' for .ipuz files, 'puz' for .puz files
```

### Parser Selection
```javascript
if (format === 'ipuz') {
  crossword = new iPuzCrossword(uploadedFile.path);
} else {
  crossword = new Crossword(uploadedFile.path);
}
```

### Database Storage
All puzzles stored with format field for future formatting decisions.

## Frontend Considerations

The client receives:
- `puz.format`: Either 'puz' or 'ipuz'
- All other data structures remain the same
- Can use format field to apply format-specific styling or behavior if needed

## Example: Parsing Cochabamba.ipuz

```
Dimensions: 10x10
Format: ipuz
Words: 34 (17 across, 17 down)
Single-letter words included in count
```

## Testing

Run `node test-ipuz.js` to verify parser functionality:
```bash
cd hitzgurutzatuak
node test-ipuz.js
```

## Future Enhancements

1. Format-specific UI rendering for clue display
2. Batch import of multiple iPuz files
3. Format conversion utilities (puz ↔ ipuz)
4. Format validation tools
