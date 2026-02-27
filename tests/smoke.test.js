/**
 * Smoke Test - Verifica que el módulo principal cargue sin errores críticos
 * Para test completos, considerar usar Jest/Mocha + Supertest
 */

const path = require('path');

console.log('🧪 Running smoke tests...\n');

let passed = 0;
let failed = 0;

function test(description, fn) {
  try {
    fn();
    console.log(`✅ ${description}`);
    passed++;
  } catch (err) {
    console.error(`❌ ${description}`);
    console.error(`   ${err.message}`);
    failed++;
  }
}

// Test 1: Utils module loads
test('Utils module loads correctly', () => {
  const utils = require('../utils.js');
  if (!utils.logDate || !utils.logError || !utils.logInfo) {
    throw new Error('Missing expected exports from utils.js');
  }
});

// Test 2: Config files load
test('Database config loads correctly', () => {
  const config = require('../config/database.js');
  if (!config.database) {
    throw new Error('Missing database configuration');
  }
});

test('Session config loads correctly', () => {
  const sessionConfig = require('../config/sessionconfig.js');
  if (!sessionConfig.secret) {
    throw new Error('Missing session secret');
  }
});

// Test 3: Routes load
test('Puzzles route loads correctly', () => {
  const puzzles = require('../routes/puzzles.js');
  if (typeof puzzles !== 'function') {
    throw new Error('Puzzles route is not a valid Express router');
  }
});

test('Users route loads correctly', () => {
  const users = require('../routes/users.js');
  if (typeof users !== 'function') {
    throw new Error('Users route is not a valid Express router');
  }
});

// Test 4: Models load
test('User model loads correctly', () => {
  const User = require('../models/user.js');
  if (!User.schema) {
    throw new Error('User model does not have a valid schema');
  }
});

test('Crossword model loads correctly', () => {
  const Crossword = require('../models/crosswords.js');
  if (!Crossword.schema) {
    throw new Error('Crossword model does not have a valid schema');
  }
});

// Test 5: Crossword class loads
test('Crossword class loads correctly', () => {
  const CrosswordClass = require('../cw/crossword.js');
  if (typeof CrosswordClass !== 'function') {
    throw new Error('Crossword is not a valid class/constructor');
  }
});

// Summary
console.log(`\n${'='.repeat(50)}`);
console.log(`✅ Passed: ${passed}`);
console.log(`❌ Failed: ${failed}`);
console.log(`${'='.repeat(50)}\n`);

if (failed > 0) {
  process.exit(1);
} else {
  console.log('🎉 All smoke tests passed!\n');
  process.exit(0);
}
