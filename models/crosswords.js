let mongoose = require('mongoose');

let cwSchema = mongoose.Schema({
  filename: String,
  width: Number,
  height: Number,
  filled_grid: [[String]],
  void_grid: [[String]],
  words: [{
    word: String,
    dir: String,
    x: Number,
    y: Number,
    length: Number
  }],
  clues: [String],
  name: String,
  author: String
});

let crossword = module.exports = mongoose.model('Crossword', cwSchema);
