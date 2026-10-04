# Crossword formats and clue layouts

## Shared crossword structure

`.puz` and `.ipuz` files are loaded through `cw/crossword.js` and exposed as the same `Crossword` class. The class keeps the source `format` (`puz` or `ipuz`) as metadata. Binary `.puz` decoding lives in the shared class; the JSON-specific decoding is delegated to `cw/ipuz-reader.js`. `cw/ipuz.js` remains a compatibility import path for older scripts.

Both formats provide the same game fields: dimensions, solution grid (`filled_grid`), playable grid (`void_grid`), title, author, clues, and word entries. Each word entry uses `word`, `dir`, `x`, `y`, `length`, `number`, `index`, and `clue`. Word numbers are assigned by start cell in row-major order, with Across before Down at the same cell. iPuz single-cell entries remain supported.

The importer chooses the source format from the filename and calls `new Crossword(path, format)`. Spirals continue to use `SpiralPuzzle`.

## Clue display modes

The crossword game offers two layouts:

- **American**: show each clue separately, numbered by its start cell, as in `.puz` puzzles.
- **Xedera**: group Across clues by row and Down clues by column. This is the existing iPuz presentation.

New iPuz games open in Xedera mode and `.puz` games open in American mode. Players can switch layouts while playing; the clue-to-word coordinates do not change.

The game API serializes canonical start-cell numbers for both formats, including puzzles already stored with older iPuz numbering.
