const crypto = require('crypto');
const fs = require('fs');
const multer = require('multer');
const path = require('path');

const uploadDirectory = path.resolve(__dirname, '..', 'uploads');
const configuredMaxSize = Number.parseInt(process.env.MAX_PUZ_UPLOAD_BYTES || '5242880', 10);
const maxFileSize = Number.isFinite(configuredMaxSize) && configuredMaxSize > 0
  ? configuredMaxSize
  : 5242880;

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
  return ext === '.puz' || ext === '.ipuz';
}

function fileFilter(req, file, callback) {
  const safeName = sanitizeOriginalFilename(file.originalname);
  file.originalname = safeName;

  if (!isAllowedPuzzleFilename(safeName)) {
    req.uploadErrors = [{
      filename: safeName,
      message: 'Fitxategiak .puz edo .ipuz luzapena izan behar du.'
    }];
    return callback(null, false);
  }

  return callback(null, true);
}

const storage = multer.diskStorage({
  destination: (req, file, callback) => callback(null, uploadDirectory),
  filename: (req, file, callback) => callback(null, `${crypto.randomUUID()}.puz`)
});

const multerUpload = multer({
  storage,
  fileFilter,
  limits: {
    files: 1,
    fileSize: maxFileSize
  }
});

function uploadPuzzle(req, res, next) {
  multerUpload.single('filename')(req, res, error => {
    if (error) {
      const message = error.code === 'LIMIT_FILE_SIZE'
        ? 'Fitxategia handiegia da.'
        : 'Ezin izan da fitxategia kargatu.';
      req.uploadErrors = [{ filename: '', message }];
    }
    next();
  });
}

uploadPuzzle.uploadDirectory = uploadDirectory;
uploadPuzzle.maxFileSize = maxFileSize;
uploadPuzzle.sanitizeOriginalFilename = sanitizeOriginalFilename;

module.exports = uploadPuzzle;
