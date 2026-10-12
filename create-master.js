#!/usr/bin/env node

/**
 * Script to create master user
 * Usage: node create-master.js [username] <password> [email]
 */

require('dotenv/config');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const colors = require('colors/safe');

const config = require('./config/database');
const UserModel = require('./models/user');

const username = (process.argv[2] || 'master').trim().toLowerCase();
const passwordArgument = process.argv[3];
const email = process.argv[4] || `${username}@hitzgurutzatuak.local`;

async function readPasswordFromStdin() {
  const chunks = [];
  for await (const chunk of process.stdin) chunks.push(chunk);
  return Buffer.concat(chunks).toString('utf8');
}

async function createMasterUser() {
  const password = passwordArgument === '--password-stdin'
    ? await readPasswordFromStdin()
    : passwordArgument;

  if (!password) {
    console.error('Usage: node create-master.js [username] <password> [email]');
    process.exitCode = 2;
    return;
  }

  try {
    console.log(colors.cyan('\nMongoDBra konektatzen...'));
    await mongoose.connect(config.database);
    console.log(colors.green('✓ MongoDBra konektatuta\n'));

    // Check if user already exists
    const existingUser = await UserModel.findOne({ username });
    if (existingUser) {
      console.log(colors.yellow(`⚠ "${username}" erabiltzailea badago lehendik.`));
      
      // Update if needed
      const salt = await bcrypt.genSalt(10);
      const hash = await bcrypt.hash(password, salt);
      
      const updated = await UserModel.findOneAndUpdate(
        { username },
        { $set: { password: hash, master: true } },
        { new: true }
      );
      
      console.log(colors.green('✓ Erabiltzailearen datuak eguneratu dira:'));
      console.log(`  Erabiltzaile-izena: ${updated.username}`);
      console.log(`  Helbide elektronikoa: ${updated.email}`);
      console.log(`  Administratzailea: ${updated.master ? 'Bai' : 'Ez'}`);
      console.log();
      
      await mongoose.disconnect();
      process.exit(0);
    }

    // Create new master user
    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash(password, salt);

    const newUser = new UserModel({
      email: email,
      username: username,
      password: hash,
      master: true
    });

    await newUser.save();
    
    console.log(colors.green('✓ Master erabiltzailea sortu da:'));
    console.log(`  Erabiltzaile-izena: ${username}`);
    console.log(`  Helbide elektronikoa: ${email}`);
    console.log('  Administratzailea: Bai\n');

    await mongoose.disconnect();
    process.exit(0);

  } catch (error) {
    console.error(colors.red('✗ Errorea:'), error.message);
    process.exit(1);
  }
}

createMasterUser();
