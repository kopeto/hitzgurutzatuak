const mongoose = require('mongoose');

const uploadedFileSchema = new mongoose.Schema({
  filename: { type: String, required: true },
  storedFilename: { type: String, default: null },
  status: {
    type: String,
    enum: ['queued', 'processing', 'awaiting_review', 'imported', 'failed', 'skipped'],
    default: 'queued'
  },
  message: { type: String, default: '' },
  allowIncomplete: { type: Boolean, default: false },
  missingClues: [{ number: Number, dir: String, x: Number, y: Number, length: Number, _id: false }],
  puzzleId: { type: mongoose.Schema.Types.ObjectId, ref: 'Crossword', default: null },
  puzzleName: { type: String, default: '' }
}, { _id: true });

const puzzleUploadBatchSchema = new mongoose.Schema({
  ownerId: { type: mongoose.Schema.Types.ObjectId, required: true, index: true },
  groupIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'GameGroup' }],
  status: {
    type: String,
    enum: ['queued', 'processing', 'awaiting_review', 'completed', 'completed_with_errors'],
    default: 'queued',
    index: true
  },
  files: { type: [uploadedFileSchema], default: [] },
  completedAt: { type: Date, default: null }
}, { timestamps: true });

module.exports = mongoose.model('PuzzleUploadBatch', puzzleUploadBatchSchema);
