#!/usr/bin/env node

require('dotenv/config');
const mongoose = require('mongoose');
const config = require('../config/database');
const UserModel = require('../models/user');

const colors = require('colors/safe');

console.log(colors.cyan('\n🔄 Master erabiltzaileak sinkronizatzen...\n'));

mongoose.connect(config.database, config.db_options);
const db = mongoose.connection;

const syncMasters = async () => {
  console.log(colors.green('✅ MongoDBra konektatuta'));
  
  try {
    const configuredIds = process.env.MASTER_USER_IDS
      ? process.env.MASTER_USER_IDS.split(/[\s,]+/).filter(Boolean)
      : [];
    const masterIds = configuredIds.filter(id => mongoose.isObjectIdOrHexString(id));

    if (masterIds.length === 0) {
      console.log(colors.yellow('⚠️  MASTER_USER_IDS aldagaian ez dago baliozko erabiltzaile ID-rik.'));
      process.exit(0);
    }

    if (masterIds.length !== configuredIds.length) {
      console.log(colors.yellow('⚠️  Baliogabeko erabiltzaile ID batzuk baztertu dira.'));
    }

    const updateMasters = await UserModel.updateMany(
      { _id: { $in: masterIds } },
      { $set: { master: true } }
    );

    console.log(colors.green(`\n✅ ${updateMasters.modifiedCount} erabiltzaile master bihurtu dira.`));

    const masterUsers = await UserModel.find({ master: true }, 'username email');
    if (masterUsers.length > 0) {
      console.log(colors.cyan('👑 Uneko master erabiltzaileak:'));
      masterUsers.forEach(user => {
        console.log(`   - ${user.username} (${user.email})`);
      });
    }

    console.log(colors.green('\n✅ Sinkronizazioa amaitu da.\n'));
    process.exit(0);

  } catch (err) {
    console.error(colors.red('❌ Errorea:'), err.message);
    process.exit(1);
  }
};

db.once('open', syncMasters);

db.on('error', (err) => {
  console.error(colors.red('❌ Konexio-errorea:'), err.message);
  process.exit(1);
});
