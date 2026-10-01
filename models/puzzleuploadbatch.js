const mongoose = require('mongoose');

const uploadedFileSchema = new mongoose.Schema({
  filename: { type: String, required: true },
  storedFilename: { type: String, default: null },
  status: {
    type: String,
    enum: ['queued', 'processing', 'imported', 'failed'],
    default: 'queued'
  },
  message: { type: String, default: '' },
  puzzleId: { type: mongoose.Schema.Types.ObjectId, ref: 'Crossword', default: null },
  puzzleName: { type: String, default: '' }
}, { _id: true });

const puzzleUploadBatchSchema = new mongoose.Schema({
  ownerId: { type: mongoose.Schema.Types.ObjectId, required: true, index: true },
  status: {
    type: String,
    enum: ['queued', 'processing', 'completed', 'completed_with_errors'],
    default: 'queued',
    index: true
  },
  files: { type: [uploadedFileSchema], default: [] },
  completedAt: { type: Date, default: null }
}, { timestamps: true });

module.exports = mongoose.model('PuzzleUploadBatch', puzzleUploadBatchSchema);
