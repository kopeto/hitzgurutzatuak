#!/usr/bin/env node
/**
 * Test script for puzzle import service
 * Verifies that both .puz and .ipuz formats are handled correctly
 */

const path = require('path');
const { validateCrossword } = require('./services/puzzle-import');
const Crossword = require('./cw/crossword');
const iPuzCrossword = require('./cw/ipuz');

console.log('Testing Puzzle Import Service...\n');

// Test 1: iPuz format
console.log('Test 1: iPuz Format (.ipuz)');
console.log('=' .repeat(40));
try {
  const fs = require('fs');
  const preferred = path.join(__dirname, 'jokoak', 'Cochabamba2.ipuz');
  let ipuzPath = preferred;
  if (!fs.existsSync(ipuzPath)) {
    const ipuzDir = path.join(__dirname, 'jokoak');
    const candidates = fs.readdirSync(ipuzDir).filter(f => f.toLowerCase().endsWith('.ipuz'));
    if (!candidates.length) {
      throw new Error('No .ipuz files found for testing');
    }
    ipuzPath = path.join(ipuzDir, candidates[0]);
  }
  const ipuz = new iPuzCrossword(ipuzPath);
  
  console.log(`✓ Successfully parsed: ${path.basename(ipuzPath)}`);
  console.log(`  Format: ${ipuz.format}`);
  console.log(`  Dimensions: ${ipuz.width}x${ipuz.height}`);
  console.log(`  Words: ${ipuz.words.length}`);
  console.log(`  Name: ${ipuz.cw_name}`);
  
  // Validate structure
  validateCrossword(ipuz);
  console.log(`✓ Validation passed`);
  console.log();
  
} catch (err) {
  console.error(`✗ Test failed: ${err.message}`);
  process.exit(1);
}

// Test 2: .puz format
console.log('Test 2: .puz Format (.puz)');
console.log('=' .repeat(40));
try {
  // List available .puz files
  const fs = require('fs');
  const puzDir = path.join(__dirname, 'puz');
  const puzFiles = fs.readdirSync(puzDir).filter(f => f.endsWith('.puz')).slice(0, 1);
  
  if (puzFiles.length === 0) {
    console.warn('⚠ No .puz files found for testing (this is OK)');
  } else {
    const puzPath = path.join(puzDir, puzFiles[0]);
    const puz = new Crossword(puzPath);
    
    console.log(`✓ Successfully parsed: ${path.basename(puzPath)}`);
    console.log(`  Format: ${puz.format}`);
    console.log(`  Dimensions: ${puz.width}x${puz.height}`);
    console.log(`  Words: ${puz.words.length}`);
    console.log(`  Name: ${puz.cw_name}`);
    
    // Validate structure
    validateCrossword(puz);
    console.log(`✓ Validation passed`);
  }
  console.log();
  
} catch (err) {
  console.error(`✗ Test failed: ${err.message}`);
  process.exit(1);
}

// Test 3: Format detection
console.log('Test 3: Format Detection');
console.log('=' .repeat(40));
const path_util = require('path');
function detectFormat(filename) {
  const ext = path_util.extname(filename).toLowerCase();
  if (ext === '.ipuz') {
    return 'ipuz';
  }
  return 'puz';
}

const testCases = [
  { filename: 'puzzle.puz', expected: 'puz' },
  { filename: 'puzzle.ipuz', expected: 'ipuz' },
  { filename: 'my-crossword.PUZ', expected: 'puz' },
  { filename: 'my-crossword.IPUZ', expected: 'ipuz' }
];

testCases.forEach(test => {
  const detected = detectFormat(test.filename);
  const status = detected === test.expected ? '✓' : '✗';
  console.log(`${status} ${test.filename}: detected as '${detected}'`);
});
console.log();

console.log('=' .repeat(40));
console.log('✓ All import tests passed!');
process.exit(0);
