const multer = require('multer');
const path = require('path');
const crypto = require('crypto');

const MAX_FILE_SIZE_MB = 5;
const MAX_FILE_SIZE = MAX_FILE_SIZE_MB * 1024 * 1024;

const allowedMime = new Set(['image/jpeg', 'image/png', 'image/webp']);

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    // store in: backend/uploads/
    cb(null, path.join(process.cwd(), 'backend', 'uploads'));
  },
  filename: (req, file, cb) => {
    const ext = file.mimetype === 'image/jpeg'
      ? '.jpg'
      : file.mimetype === 'image/png'
      ? '.png'
      : '.webp';

    const id = crypto.randomUUID ? crypto.randomUUID() : crypto.randomBytes(16).toString('hex');
    cb(null, `${id}${ext}`);
  },
});

const fileFilter = (req, file, cb) => {
  if (!allowedMime.has(file.mimetype)) {
    return cb(new Error('Invalid file type. Only jpeg, png, webp allowed.'));
  }
  cb(null, true);
};

const uploadImage = multer({
  storage,
  fileFilter,
  limits: { fileSize: MAX_FILE_SIZE },
});

module.exports = uploadImage;
