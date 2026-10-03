const mongoose = require('mongoose');

async function main() {
  try {
    await mongoose.connect(process.env.DB_CONNECTION, {
      serverSelectionTimeoutMS: 5000,
    });
    await mongoose.disconnect();
  } catch (error) {
    console.error('Ezin izan da tokiko MongoDBra konektatu.');
    process.exitCode = 1;
  }
}

main();
