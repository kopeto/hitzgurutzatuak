const cw = require('./cw/crossword.js')

let mycw = new cw('./uploads/hika adizkiak 20161005.puz');

mycw.print_grid();
//mycw.print_words_and_clues();
mycw.print_info();
