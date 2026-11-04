# Crossword formats and clue layouts

## Shared crossword structure

`.puz` and `.ipuz` files are loaded through `cw/crossword.js` and exposed as the same `Crossword` class. The class keeps the source `format` (`puz` or `ipuz`) as metadata. Binary `.puz` decoding lives in the shared class; the JSON-specific decoding is delegated to `cw/ipuz-reader.js`. `cw/ipuz.js` remains a compatibility import path for older scripts.

Both formats provide the same game fields: dimensions, solution grid (`filled_grid`), playable grid (`void_grid`), title, author, clues, and word entries. Each word entry uses `word`, `dir`, `x`, `y`, `length`, `number`, `index`, and `clue`. Word numbers are assigned by start cell in row-major order, with Across before Down at the same cell. iPuz single-cell entries remain supported.

For iPuz, numbered clues match the labels in the source grid. Unnumbered clues are assigned in start-cell row-major order for both Across and Down; grouping Down clues by column is a display step and must not change their assignment.

The importer chooses the source format from the filename and calls `new Crossword(path, format)`. Spirals continue to use `SpiralPuzzle`.

Parsers expose `isComplete` and `missingClues`. Empty or absent definitions, `-` and the legacy `Ninguna pista` placeholder require review before import. Missing entries include the word number, direction and coordinates, without the answer. iPuz object, `[number, text]` and plain-text clue entries are supported; empty entries keep their position so subsequent definitions stay attached to the correct word. PUZ reads the declared clue count, preserves empty strings and excludes trailing notes and extension data. SPL checks empty definition texts and missing clue lists.

The importer raises `PuzzleReviewRequired` before archiving or saving an incomplete game. The upload queue retains its temporary file until the owner chooses to import it with `allowIncomplete: true` or discard it. Confirmed games retain `isComplete: false` and `missingClueCount`; these describe the source definitions independently of a player's progress.

## Clue display modes

The crossword game offers two layouts:

- **American**: show each clue separately, numbered by its start cell, as in `.puz` puzzles.
- **Xedera**: group Across clues by row and Down clues by column. This is the existing iPuz presentation.

New iPuz games open in Xedera mode and `.puz` games open in American mode. Players can switch layouts while playing; the clue-to-word coordinates do not change.

The game API serializes canonical start-cell numbers for both formats, including puzzles already stored with older iPuz numbering.
