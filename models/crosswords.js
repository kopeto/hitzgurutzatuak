let mongoose = require('mongoose');

let cwSchema = mongoose.Schema({
  filename: String,
  fileHash: {
    type: String,
    unique: true,
    sparse: true
  },
  width: Number,
  height: Number,
  filled_grid: [[String]],
  void_grid: [[String]],
  words: [{
    word: String,
    dir: String,
    x: Number,
    y: Number,
    length: Number,
    number: Number,
    clue: String
  }],
  clues: [String],
  name: String,
  author: String,
  gameType: {
    type: String,
    enum: ['crossword', 'spiral'],
    default: 'crossword'
  },
  format: {
    type: String,
    enum: ['puz', 'ipuz', 'spl'],
    default: 'puz'
  },
  spiral: {
    type: mongoose.Schema.Types.Mixed,
    default: null
  }
}, { timestamps: true });

let crossword = module.exports = mongoose.model('Crossword', cwSchema);
