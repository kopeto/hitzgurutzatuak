#!/usr/bin/env node
/**
 * Test script for iPuz parser
 * Tests parsing Cochabamba.ipuz and verifies the output structure
 */

const path = require('path');
const fs = require('fs');
const iPuzCrossword = require('./cw/ipuz');

try {
  console.log('Testing iPuz Parser...\n');
  
  // Test with Cochabamba2.ipuz (or fallback to first available .ipuz)
  const preferred = path.join(__dirname, 'jokoak', 'Cochabamba2.ipuz');
  let testFile = preferred;
  if (!fs.existsSync(testFile)) {
    const ipuzDir = path.join(__dirname, 'jokoak');
    const candidates = fs.readdirSync(ipuzDir)
      .filter(f => f.toLowerCase().endsWith('.ipuz'));
    if (!candidates.length) {
      throw new Error('No .ipuz files found in jokoak/');
    }
    testFile = path.join(ipuzDir, candidates[0]);
  }
  console.log(`Loading: ${testFile}\n`);
  
  const puzzle = new iPuzCrossword(testFile);
  
  console.log('✓ Successfully parsed iPuz file\n');
  console.log('Puzzle Info:');
  console.log(`  Name: ${puzzle.cw_name}`);
  console.log(`  Author: ${puzzle.cw_author}`);
  console.log(`  Format: ${puzzle.format}`);
  console.log(`  Dimensions: ${puzzle.width}x${puzzle.height}\n`);
  
  console.log('Grid Structure:');
  console.log(`  filled_grid: ${puzzle.filled_grid.length} rows`);
  console.log(`  void_grid: ${puzzle.void_grid.length} rows`);
  console.log(`  words: ${puzzle.words.length} words`);
  console.log(`  clues: ${puzzle.clues.length} clues\n`);
  
  // Count by direction
  const acrossWords = puzzle.words.filter(w => w.dir === 'right');
  const downWords = puzzle.words.filter(w => w.dir === 'down');
  console.log(`Word distribution:`);
  console.log(`  Across: ${acrossWords.length}`);
  console.log(`  Down: ${downWords.length}\n`);
  
  // Show grid
  console.log('Grid visualization:');
  for (let i = 0; i < puzzle.height; i++) {
    let line = '';
    for (let j = 0; j < puzzle.width; j++) {
      line += puzzle.filled_grid[i][j] === '.' ? '#' : (puzzle.filled_grid[i][j] || '.');
    }
    console.log(line);
  }
  console.log();
  
  // Sample words
  console.log('First 10 words:');
  puzzle.words.slice(0, 10).forEach(w => {
    console.log(`  [${w.number}] ${w.dir === 'right' ? 'A' : 'D'}: "${w.word}" (${w.length} letters) @ (${w.x},${w.y})`);
  });
  
  console.log('\n✓ All tests passed!');
  process.exit(0);
  
} catch (err) {
  console.error('✗ Test failed:');
  console.error(err.message);
  console.error(err.stack);
  process.exit(1);
}

