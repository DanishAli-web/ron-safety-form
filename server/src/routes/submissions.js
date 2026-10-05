import { Router } from 'express';
import { randomUUID } from 'node:crypto';
import { supabase } from '../supabase.js';
import { requireRole } from '../middleware/auth.js';
import { handlePhotoUpload, ALLOWED_TYPES } from '../middleware/upload.js';
import { isUuid, isValidDate } from '../utils/validate.js';

const router = Router();
const BUCKET = 'submission-photos';

const CHECKLIST_FIELDS = [
  'hard_hat',
  'hi_vis_vest',
  'safety_boots',
  'eye_protection',
  'fall_protection',
  'ladders_scaffolding_inspected',
  'tools_cords_ok',
  'hazards_identified',
];

// POST /api/submissions  (framers only)
// Sent as multipart/form-data: site_id, work_date, checklist fields ("true"/"false"),
// notes, and one or more files under "photos".
router.post('/', requireRole('framer'), handlePhotoUpload, async (req, res) => {
  const { site_id, work_date, notes } = req.body;
  const files = req.files || [];

  // ---- Validation ----
  if (!isUuid(site_id)) {
    return res.status(400).json({ error: 'Please choose a job site.' });
  }
  if (!isValidDate(work_date)) {
    return res.status(400).json({ error: 'Please choose a valid date.' });
  }
  if (files.length === 0) {
    return res.status(400).json({ error: 'Please attach at least one photo.' });
  }
  if (notes && notes.length > 2000) {
    return res.status(400).json({ error: 'Notes must be 2000 characters or fewer.' });
  }

 const { data: site, error: siteError } = await supabase
  .from('sites')
  .select('id')
  .eq('id', site_id)
  .maybeSingle();

if (siteError) throw siteError;
if (!site) {
  return res.status(400).json({ error: 'That job site does not exist.' });
}
  
  // Checkboxes arrive as strings; anything other than "true" counts as unchecked
  const checklist = {};
  for (const field of CHECKLIST_FIELDS) {
    checklist[field] = req.body[field] === 'true';
  }

  // ---- 1. Save the submission ----
  const { data: submission, error: insertError } = await supabase
    .from('submissions')
    .insert({
      user_id: req.user.id, // always the logged-in user, never taken from the request
      site_id,
      work_date,
      ...checklist,
      notes: notes?.trim() || null,
    })
    .select('id')
    .single();

  if (insertError) {
    // 23505 = unique constraint violation (already submitted for this site and date)
    if (insertError.code === '23505') {
      return res.status(409).json({
        error: 'You have already submitted a form for this site on this date.',
      });
    }
    throw insertError;
  }

  // ---- 2. Upload photos, then record them ----
  // If anything fails, remove what was saved so we don't leave a form with missing photos.
  const uploadedPaths = [];
  try {
    for (const file of files) {
      const path = `${submission.id}/${randomUUID()}.${ALLOWED_TYPES[file.mimetype]}`;
      const { error } = await supabase.storage
        .from(BUCKET)
        .upload(path, file.buffer, { contentType: file.mimetype });
      if (error) throw error;
      uploadedPaths.push({ path, file_name: file.originalname });
    }

    const { error: photoError } = await supabase.from('submission_photos').insert(
      uploadedPaths.map((p) => ({
        submission_id: submission.id,
        storage_path: p.path,
        file_name: p.file_name,
      })),
    );
    if (photoError) throw photoError;
  } catch (err) {
    if (uploadedPaths.length > 0) {
      await supabase.storage.from(BUCKET).remove(uploadedPaths.map((p) => p.path));
    }
    await supabase.from('submissions').delete().eq('id', submission.id);
    throw err;
  }

  res.status(201).json({ id: submission.id, message: 'Safety form submitted.' });
});

export default router;