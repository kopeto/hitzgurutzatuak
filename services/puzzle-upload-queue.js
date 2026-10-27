const path = require('path');
const PuzzleUploadBatch = require('../models/puzzleuploadbatch');
const upload = require('../config/uploadconfig');
const { importPuzzle } = require('./puzzle-import');
const { logError } = require('../utils');

const queuedBatchIds = new Set();
let queueTail = Promise.resolve();

function updateBatchStatus(batch) {
  const hasPendingFiles = batch.files.some(file => file.status === 'queued' || file.status === 'processing');
  if (hasPendingFiles) {
    batch.status = batch.files.some(file => file.status === 'processing') ? 'processing' : 'queued';
    batch.completedAt = null;
    return;
  }

  const hasFailures = batch.files.some(file => file.status === 'failed');
  batch.status = hasFailures ? 'completed_with_errors' : 'completed';
  batch.completedAt = new Date();
}

async function processBatch(batchId) {
  const batch = await PuzzleUploadBatch.findById(batchId);
  if (!batch) return;

  for (const file of batch.files) {
    if (file.status !== 'queued') continue;

    file.status = 'processing';
    file.message = '';
    batch.status = 'processing';
    batch.completedAt = null;
    await batch.save();

    try {
      if (!file.storedFilename) throw new Error('Ez da fitxategia aurkitu.');
      // New batches include the upload date; older ones still use a bare filename.
      const filePath = path.resolve(upload.uploadDirectory, file.storedFilename);
      if (!filePath.startsWith(`${upload.uploadDirectory}${path.sep}`)) {
        throw new Error('Fitxategiaren bidea ez da baliozkoa.');
      }
      const uploadedFile = {
        path: filePath,
        originalname: file.filename
      };
      const puzzle = await importPuzzle(uploadedFile);
      file.storedFilename = path.relative(upload.uploadDirectory, uploadedFile.path);
      file.status = 'imported';
      file.puzzleId = puzzle._id;
      file.puzzleName = puzzle.name;
      file.message = '';
    } catch (error) {
      file.status = 'failed';
      file.message = error.message || 'Ezin izan da puzlea kargatu.';
      if (error.name !== 'PuzzleImportError' && error.code !== 11000) logError(error);
    }

    updateBatchStatus(batch);
    await batch.save();
  }

  updateBatchStatus(batch);
  await batch.save();
}

function enqueueBatch(batchId) {
  const id = String(batchId);
  if (queuedBatchIds.has(id)) return;

  queuedBatchIds.add(id);
  queueTail = queueTail
    .then(() => processBatch(id))
    .catch(error => logError(error))
    .finally(() => queuedBatchIds.delete(id));
}

async function resumePendingPuzzleUploadBatches() {
  const pending = await PuzzleUploadBatch.find({ status: { $in: ['queued', 'processing'] } }).select('_id files');
  for (const batch of pending) {
    let changed = false;
    for (const file of batch.files) {
      if (file.status === 'processing') {
        file.status = 'queued';
        changed = true;
      }
    }
    if (changed) await batch.save();
    enqueueBatch(batch._id);
  }
}

module.exports = { enqueueBatch, resumePendingPuzzleUploadBatches };
