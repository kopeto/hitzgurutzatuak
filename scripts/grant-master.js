#!/usr/bin/env node

require('dotenv/config');
const mongoose = require('mongoose');
const colors = require('colors/safe');

const config = require('../config/database');
const UserModel = require('../models/user');

const username = String(process.argv[2] || '').trim().toLowerCase();

if (!username) {
  console.error(colors.red('Erabilera: node scripts/grant-master.js <erabiltzailea>'));
  process.exit(1);
}

async function grantMasterRole() {
  try {
    await mongoose.connect(config.database);
    const user = await UserModel.findOneAndUpdate(
      { username },
      { $set: { master: true } },
      { new: true }
    );

    if (!user) {
      console.error(colors.red(`Ez da “${username}” erabiltzailea aurkitu.`));
      process.exitCode = 1;
      return;
    }

    console.log(colors.green(`“${user.username}” erabiltzaileak master baimena du orain.`));
  } catch (error) {
    console.error(colors.red('Ezin izan da master baimena eman:'), error.message);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
  }
}

grantMasterRole();
