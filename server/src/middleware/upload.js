import multer from 'multer';

export const ALLOWED_TYPES = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB
const MAX_FILES = 5;

// Keep files in memory just long enough to send them on to Supabase Storage
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_FILE_SIZE, files: MAX_FILES },
  fileFilter: (req, file, cb) => {
    if (ALLOWED_TYPES[file.mimetype]) return cb(null, true);
    const err = new Error('Photos must be JPG, PNG or WebP images.');
    err.status = 400;
    cb(err);
  },
}).array('photos', MAX_FILES);

// Wraps multer so upload problems become clear 400 messages
// instead of falling through to the generic 500 handler.
export function handlePhotoUpload(req, res, next) {
  upload(req, res, (err) => {
    if (!err) return next();

    if (err instanceof multer.MulterError) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ error: 'Each photo must be 5 MB or smaller.' });
      }
      if (err.code === 'LIMIT_FILE_COUNT' || err.code === 'LIMIT_UNEXPECTED_FILE') {
        return res.status(400).json({ error: `You can attach up to ${MAX_FILES} photos.` });
      }
      return res.status(400).json({ error: 'There was a problem with the uploaded photos.' });
    }
    if (err.status === 400) {
      return res.status(400).json({ error: err.message });
    }
    next(err);
  });
}