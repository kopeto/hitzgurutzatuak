const mongoose = require('mongoose');

const UserSchema = mongoose.Schema({
  email:{
    type: String,
    required: true,
    trim: true,
    lowercase: true,
    unique: true
  },
  username:{
    type: String,
    required: true,
    trim: true,
    lowercase: true,
    unique: true
  },
  password:{
    type: String,
    required: true
  },
  master:{
    type: Boolean,
    default: false
  }

});

const User = module.exports = mongoose.model('User', UserSchema);
