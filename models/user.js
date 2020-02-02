const mongoose = require('mongoose');

// User Schema
const UserSchema = mongoose.Schema({
  email:{
    type: String,
    required: true
  },
  username:{
    type: String,
    required: true
  },
  password:{
    type: String,
    required: true
  },
  master:{
    type: Boolean,
    required: true
  }

});

const User = module.exports = mongoose.model('User', UserSchema);
