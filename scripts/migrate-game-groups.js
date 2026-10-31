require('dotenv/config');
const mongoose = require('mongoose');
const { ensureGameGroups } = require('../services/game-groups');

async function main() {
  try {
    await mongoose.connect(process.env.DB_CONNECTION);
    await ensureGameGroups();
    console.log('Jokoak eta Guztiak prest daude. Aurreko jokoak migratu dira.');
  } finally {
    await mongoose.disconnect();
  }
}

main().catch(error => {
  console.error(error.message);
  process.exitCode = 1;
});
