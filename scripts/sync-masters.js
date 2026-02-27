#!/usr/bin/env node

/**
 * Script para sincronizar usuarios master desde .env con la BD
 * Uso: node scripts/sync-masters.js
 */

require('dotenv/config');
const mongoose = require('mongoose');
const config = require('../config/database');
const UserModel = require('../models/user');

const colors = require('colors/safe');

console.log(colors.cyan('\n🔄 Sincronizando usuarios master...\n'));

// Conectar a MongoDB
mongoose.connect(config.database, config.db_options);
const db = mongoose.connection;

const syncMasters = async () => {
  console.log(colors.green('✅ Conectado a MongoDB'));
  
  try {
    const masters = process.env.MASTERS ? process.env.MASTERS.split(' ') : [];
    console.log(colors.cyan(`📋 Masters definidos en .env: ${masters.join(', ')}`));
    
    if (masters.length === 0) {
      console.log(colors.yellow('⚠️  No hay usuarios master definidos en .env'));
      process.exit(0);
    }

    // Actualizar todos los usuarios: master=true si están en la lista, master=false si no
    const updateMasters = await UserModel.updateMany(
      { username: { $in: masters } },
      { $set: { master: true } }
    );

    const updateNonMasters = await UserModel.updateMany(
      { username: { $nin: masters } },
      { $set: { master: false } }
    );

    console.log(colors.green(`\n✅ ${updateMasters.modifiedCount} usuario(s) promovido(s) a master`));
    console.log(colors.yellow(`⚠️  ${updateNonMasters.modifiedCount} usuario(s) sin permisos master\n`));

    // Mostrar usuarios master actuales
    const masterUsers = await UserModel.find({ master: true }, 'username email');
    if (masterUsers.length > 0) {
      console.log(colors.cyan('👑 Usuarios master actuales:'));
      masterUsers.forEach(user => {
        console.log(`   - ${user.username} (${user.email})`);
      });
    }

    console.log(colors.green('\n✅ Sincronización completada\n'));
    process.exit(0);

  } catch (err) {
    console.error(colors.red('❌ Error:'), err.message);
    process.exit(1);
  }
};

db.once('open', syncMasters);

db.on('error', (err) => {
  console.error(colors.red('❌ Error de conexión:'), err.message);
  process.exit(1);
});
