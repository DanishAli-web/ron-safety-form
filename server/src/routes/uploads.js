import { Router } from 'express';
import { randomUUID } from 'node:crypto';
import { supabase } from '../supabase.js';
import { ALLOWED_TYPES, BUCKET, MAX_FILE_SIZE, MAX_FILES } from '../utils/photos.js';

const router = Router();

/**
 * POST /api/uploads
 *
 * Gives the browser permission to upload photos directly to Supabase Storage,
 * so photo data never passes through this server. Framers only.
 *
 * @param {import('express').Request} req - Body: `{ files: [{ type, size }] }`.
 * @param {import('express').Response} res - Sends
 *   `{ uploads: [{ path, token, signed_url }] }`, in the same order as `files`.
 */
router.post('/', async (req, res) => {
  const files = req.body?.files;

  if (!Array.isArray(files) || files.length === 0) {
    return res.status(400).json({ error: 'Please attach at least one photo.' });
  }
  if (files.length > MAX_FILES) {
    return res.status(400).json({ error: `You can attach up to ${MAX_FILES} photos.` });
  }
  for (const file of files) {
    if (!ALLOWED_TYPES[file?.type]) {
      return res.status(400).json({ error: 'Photos must be JPG, PNG or WebP images.' });
    }
    if (!Number.isInteger(file.size) || file.size <= 0 || file.size > MAX_FILE_SIZE) {
      return res.status(400).json({ error: 'Each photo must be 5 MB or smaller.' });
    }
  }

  // One signed upload URL per photo, inside a folder named after the user.
  // Each token only allows uploading to its own path, and expires after 2 hours.
  const uploads = await Promise.all(
    files.map(async (file) => {
      const path = `${req.user.id}/${randomUUID()}.${ALLOWED_TYPES[file.type]}`;
      const { data, error } = await supabase.storage.from(BUCKET).createSignedUploadUrl(path);
      if (error) throw error;
      return { path: data.path, token: data.token, signed_url: data.signedUrl };
    }),
  );

  res.json({ uploads });
});

export default router;