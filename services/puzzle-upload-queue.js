const path = require('path');
const fs = require('fs/promises');
const PuzzleUploadBatch = require('../models/puzzleuploadbatch');
const upload = require('../config/uploadconfig');
const { importPuzzle, PuzzleImportError, PuzzleReviewRequired } = require('./puzzle-import');
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

  if (batch.files.some(file => file.status === 'awaiting_review')) {
    batch.status = 'awaiting_review';
    batch.completedAt = null;
    return;
  }

  const hasFailures = batch.files.some(file => file.status === 'failed');
  batch.status = hasFailures ? 'completed_with_errors' : 'completed';
  batch.completedAt = new Date();
}

function storedFilePath(filename) {
  if (!filename) throw new PuzzleImportError('Ez da fitxategia aurkitu.');
  const filePath = path.resolve(upload.uploadDirectory, filename);
  if (!filePath.startsWith(`${upload.uploadDirectory}${path.sep}`)) {
    throw new PuzzleImportError('Fitxategiaren bidea ez da baliozkoa.');
  }
  return filePath;
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
      // New batches include the upload date; older ones still use a bare filename.
      const filePath = storedFilePath(file.storedFilename);
      const uploadedFile = {
        path: filePath,
        originalname: file.filename
      };
      const puzzle = await importPuzzle(uploadedFile, {
        groupIds: (batch.groupIds || []).map(String), keepForReview: true,
        allowIncomplete: file.allowIncomplete === true
      });
      file.storedFilename = path.relative(upload.uploadDirectory, uploadedFile.path);
      file.status = 'imported';
      file.puzzleId = puzzle._id;
      file.puzzleName = puzzle.name;
      file.message = '';
    } catch (error) {
      file.status = error instanceof PuzzleReviewRequired ? 'awaiting_review' : 'failed';
      file.message = error.message || 'Ezin izan da puzlea kargatu.';
      if (error instanceof PuzzleReviewRequired) {
        file.missingClues = error.missingClues;
        file.puzzleName = error.puzzleName;
      }
      if (!(error instanceof PuzzleImportError) && error.code !== 11000) logError(error);
    }

    updateBatchStatus(batch);
    await batch.save();
  }

  updateBatchStatus(batch);
  await batch.save();
}

async function resolveUploadReview(batchId, fileId, ownerId, action) {
  const { isId } = require('./game-groups');
  if (!isId(batchId) || !isId(fileId)) throw new PuzzleImportError('Karga ez da aurkitu.', 404);
  if (!['import', 'skip'].includes(action)) throw new PuzzleImportError('Aukeratu igo edo ez igo.');
  // Coordinate decisions with the worker so a stale batch cannot overwrite them.
  const pending = queueTail.then(async () => {
    const batch = await PuzzleUploadBatch.findOne({ _id: batchId, ownerId });
    const file = batch?.files.id(fileId);
    if (!file) throw new PuzzleImportError('Karga ez da aurkitu.', 404);
    if (file.status !== 'awaiting_review') throw new PuzzleImportError('Fitxategi hau ez dago erabaki baten zain.', 409);
    if (action === 'import') {
      file.allowIncomplete = true;
      file.status = 'queued';
    } else {
      await fs.rm(storedFilePath(file.storedFilename), { force: true });
      file.storedFilename = null;
      file.status = 'skipped';
    }
    file.message = '';
    updateBatchStatus(batch);
    await batch.save();
    return batch;
  });
  queueTail = pending.catch(() => {});
  const batch = await pending;
  if (action === 'import') enqueueBatch(batch._id);
  return batch;
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

module.exports = { enqueueBatch, resumePendingPuzzleUploadBatches, resolveUploadReview };
