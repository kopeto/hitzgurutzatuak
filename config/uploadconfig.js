const crypto = require('crypto');
const fs = require('fs');
const multer = require('multer');
const path = require('path');

const uploadDirectory = path.resolve(__dirname, '..', 'uploads');
const configuredMaxSize = Number.parseInt(process.env.MAX_PUZ_UPLOAD_BYTES || '5242880', 10);
const maxFileSize = Number.isFinite(configuredMaxSize) && configuredMaxSize > 0
  ? configuredMaxSize
  : 5242880;
const configuredMaxBatchFiles = Number.parseInt(process.env.MAX_PUZ_BATCH_FILES || '1000', 10);
const maxBatchFiles = Number.isFinite(configuredMaxBatchFiles) && configuredMaxBatchFiles > 0
  ? configuredMaxBatchFiles
  : 1000;

fs.mkdirSync(uploadDirectory, { recursive: true });

function sanitizeOriginalFilename(filename) {
  const baseName = path.basename(filename || '').normalize('NFKC');
  const safeName = baseName
    .replace(/[^\p{L}\p{N}._ -]/gu, '_')
    .slice(0, 180);

  return safeName || 'puzlea.puz';
}

function isAllowedPuzzleFilename(filename) {
  const ext = path.extname(filename).toLowerCase();
  return ext === '.puz' || ext === '.ipuz' || ext === '.spl';
}

function fileFilter(req, file, callback) {
  const safeName = sanitizeOriginalFilename(file.originalname);
  file.originalname = safeName;

  if (!isAllowedPuzzleFilename(safeName)) {
    req.uploadErrors = req.uploadErrors || [];
    req.uploadErrors.push({
      filename: safeName,
      message: 'Fitxategiak .puz, .ipuz edo .spl luzapena izan behar du.'
    });
    return callback(null, false);
  }

  return callback(null, true);
}

function uploadDate(date = new Date()) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Madrid',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).formatToParts(date);
  const value = type => parts.find(part => part.type === type).value;
  return `${value('year')}-${value('month')}-${value('day')}`;
}

const storage = multer.diskStorage({
  destination: (req, file, callback) => {
    req.puzzleUploadDirectory = req.puzzleUploadDirectory || path.join(uploadDirectory, uploadDate());
    fs.mkdir(req.puzzleUploadDirectory, { recursive: true }, error => {
      callback(error, req.puzzleUploadDirectory);
    });
  },
  // Keep uploads separate until validation; the archive uses the original name.
  filename: (req, file, callback) => callback(null, `.${crypto.randomUUID()}.tmp`)
});

const multerUpload = multer({
  storage,
  fileFilter,
  limits: {
    files: maxBatchFiles,
    fields: 5,
    parts: maxBatchFiles + 5,
    fileSize: maxFileSize
  }
});

function runUpload(middleware, req, res, next) {
  middleware(req, res, error => {
    if (error) {
      const message = error.code === 'LIMIT_FILE_SIZE'
        ? `Fitxategi bakoitzak gehienez ${Math.ceil(maxFileSize / (1024 * 1024))} MB izan ditzake.`
        : error.code === 'LIMIT_FILE_COUNT' || error.code === 'LIMIT_UNEXPECTED_FILE'
          ? `Gehienez ${maxBatchFiles} fitxategi igo daitezke aldi bakoitzean.`
          : 'Ezin izan da fitxategia kargatu.';
      req.uploadErrors = req.uploadErrors || [];
      req.uploadErrors.push({ filename: '', message });
      req.uploadFatal = true;
      req.uploadFatalStatus = error.code === 'LIMIT_FILE_SIZE' ? 413 : 400;
    }
    next();
  });
}

function uploadPuzzle(req, res, next) {
  return runUpload(multerUpload.single('filename'), req, res, next);
}

uploadPuzzle.multiple = function uploadMultiplePuzzles(req, res, next) {
  return runUpload(multerUpload.array('filename', maxBatchFiles), req, res, next);
};

uploadPuzzle.uploadDirectory = uploadDirectory;
uploadPuzzle.maxFileSize = maxFileSize;
uploadPuzzle.maxBatchFiles = maxBatchFiles;
uploadPuzzle.sanitizeOriginalFilename = sanitizeOriginalFilename;

module.exports = uploadPuzzle;
