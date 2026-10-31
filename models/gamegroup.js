const mongoose = require('mongoose');

const gameGroupSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, maxlength: 200 },
  description: { type: String, default: '', trim: true, maxlength: 20000 },
  parentId: { type: mongoose.Schema.Types.ObjectId, ref: 'GameGroup', default: null },
  sortOrder: { type: Number, default: 0, min: 0, max: 1000000 },
  systemKey: { type: String, enum: ['root', 'all'], unique: true, sparse: true }
}, { timestamps: true });

gameGroupSchema.index({ parentId: 1, sortOrder: 1, _id: 1 });

module.exports = mongoose.model('GameGroup', gameGroupSchema);
