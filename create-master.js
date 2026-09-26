#!/usr/bin/env node

/**
 * Script to create master user
 * Usage: node create-master.js [username] [password] [email]
 */

require('dotenv/config');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const colors = require('colors/safe');

const config = require('./config/database');
const UserModel = require('./models/user');

const username = (process.argv[2] || 'master').trim().toLowerCase();
const password = process.argv[3] || '1234';
const email = process.argv[4] || `${username}@hitzgurutzatuak.local`;

async function createMasterUser() {
  try {
    console.log(colors.cyan(`\nMongoDBra konektatzen: ${config.database}`));
    await mongoose.connect(config.database);
    console.log(colors.green('✓ Konektado a MongoDB\n'));

    // Check if user already exists
    const existingUser = await UserModel.findOne({ username });
    if (existingUser) {
      console.log(colors.yellow(`⚠ Erabiltzailea "${username}" dagoeneko existitzen da.`));
      
      // Update if needed
      const salt = await bcrypt.genSalt(10);
      const hash = await bcrypt.hash(password, salt);
      
      const updated = await UserModel.findOneAndUpdate(
        { username },
        { $set: { password: hash, master: true } },
        { new: true }
      );
      
      console.log(colors.green(`✓ Erabiltzailea eguneratu da:`));
      console.log(`  Erabiltzaile-izena: ${updated.username}`);
      console.log(`  Helbide elektronikoa: ${updated.email}`);
      console.log(`  Nagusia: ${updated.master}`);
      console.log(`  Pasahitza: ${password}\n`);
      
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
    console.log(`  Pasahitza: ${password}`);
    console.log(`  Nagusia: true\n`);

    await mongoose.disconnect();
    process.exit(0);

  } catch (error) {
    console.error(colors.red('✗ Errorea:'), error.message);
    process.exit(1);
  }
}

createMasterUser();
