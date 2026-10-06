import { Router } from 'express';
import { supabase } from '../supabase.js';
import { requireRole } from '../middleware/auth.js';
import { isUuid, isValidDate } from '../utils/validate.js';
import { BUCKET, MAX_FILES } from '../utils/photos.js';

const router = Router();

/**
 * @type {string[]}
 */

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

/**
 * Shape of a photo path created by POST /api/uploads: `USER-ID/RANDOM-ID.ext`.
 * @type {RegExp}
 */
const PHOTO_PATH_RE = /^[0-9a-f-]{36}\/[0-9a-f-]{36}\.(jpg|png|webp)$/i;

/**
 * Checks that a photo was actually uploaded to Storage at the given path.
 *
 * @param {string} path 
 * @returns {Promise<boolean>} 
 * @throws 
 */
async function photoExists(path) {
  const [folder, fileName] = path.split('/');
  const { data, error } = await supabase.storage
    .from(BUCKET)
    .list(folder, { search: fileName, limit: 1 });
  if (error) throw error;
  return data.some((item) => item.name === fileName);
}

/**
 *  POST /api/submissions
 * @param {import('express').Request} req - JSON body:
 *   `{ site_id, work_date, notes?, hard_hat?, …, photos: [{ path, file_name }] }`.
 *   Checklist values must be booleans; anything other than `true` counts as unchecked.
 * @param {import('express').Response} res
 */
router.post('/', requireRole('framer'), async (req, res) => {
  const { site_id, work_date, notes, photos } = req.body ?? {};

  // ---- Validate the form ----
  if (!isUuid(site_id)) {
    return res.status(400).json({ error: 'Please choose a job site.' });
  }
  if (!isValidDate(work_date)) {
    return res.status(400).json({ error: 'Please choose a valid date.' });
  }
  if (notes != null && (typeof notes !== 'string' || notes.length > 2000)) {
    return res.status(400).json({ error: 'Notes must be 2000 characters or fewer.' });
  }

  // ---- Validate the photos ----
  if (!Array.isArray(photos) || photos.length === 0) {
    return res.status(400).json({ error: 'Please attach at least one photo.' });
  }
  if (photos.length > MAX_FILES) {
    return res.status(400).json({ error: `You can attach up to ${MAX_FILES} photos.` });
  }

  const ownFolder = `${req.user.id}/`;
  for (const photo of photos) {
    // Only photos uploaded into this user's own folder can be attached
    if (
      typeof photo?.path !== 'string' ||
      !PHOTO_PATH_RE.test(photo.path) ||
      !photo.path.startsWith(ownFolder)
    ) {
      return res.status(400).json({ error: 'One of the photos is invalid. Please add it again.' });
    }
    if (typeof photo.file_name !== 'string' || !photo.file_name || photo.file_name.length > 255) {
      return res.status(400).json({ error: 'One of the photos is missing its file name.' });
    }
  }
  if (new Set(photos.map((p) => p.path)).size !== photos.length) {
    return res.status(400).json({ error: 'The same photo was attached twice.' });
  }

  const found = await Promise.all(photos.map((p) => photoExists(p.path)));
  if (found.includes(false)) {
    return res.status(400).json({ error: 'One of the photos did not finish uploading. Please try again.' });
  }

  // ---- Check the site ----
  const { data: site, error: siteError } = await supabase
    .from('sites')
    .select('id')
    .eq('id', site_id)
    .maybeSingle();

  if (siteError) throw siteError;
  if (!site) {
    return res.status(400).json({ error: 'That job site does not exist.' });
  }

  // JSON has real booleans now; anything other than true counts as unchecked
  const checklist = {};
  for (const field of CHECKLIST_FIELDS) {
    checklist[field] = req.body[field] === true;
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

  // ---- 2. Record the photos ----
  const { error: photoError } = await supabase.from('submission_photos').insert(
    photos.map((p) => ({
      submission_id: submission.id,
      storage_path: p.path,
      file_name: p.file_name,
    })),
  );

  if (photoError) {
    // Undo the submission so there's never a form without its photos.
    // The uploaded files stay in Storage, so the user can retry with them.
    await supabase.from('submissions').delete().eq('id', submission.id);

    if (photoError.code === '23505') {
      return res.status(400).json({ error: 'One of these photos is already attached to another form.' });
    }
    throw photoError;
  }

  res.status(201).json({ id: submission.id, message: 'Safety form submitted.' });
});

/**
 * GET /api/submissions
 * 
 * Lists submissions, newest first. Framers always get only their own; admins
 * get everyone's and can filter by worker.
 * @param {import('express').Request} req - Optional query filters: `site_id`,
 *   `user_id` (admins only), `from` and `to` (YYYY-MM-DD, inclusive).
 * @param {import('express').Response} res - Sends an array of
 *   `{ id, work_date, status, created_at, site, worker, photo_count }`.
 */
router.get('/', async (req, res) => {
  const { site_id, user_id, from, to } = req.query;

  if (site_id && !isUuid(site_id)) return res.status(400).json({ error: 'Invalid site filter.' });
  if (user_id && !isUuid(user_id)) return res.status(400).json({ error: 'Invalid worker filter.' });
  if (from && !isValidDate(from)) return res.status(400).json({ error: 'Invalid start date.' });
  if (to && !isValidDate(to)) return res.status(400).json({ error: 'Invalid end date.' });

  let query = supabase
    .from('submissions')
    .select(`
      id, work_date, status, created_at,
      site:sites (id, name),
      worker:profiles (id, full_name),
      photos:submission_photos (count)
    `)
    .order('work_date', { ascending: false })
    .order('created_at', { ascending: false });

  if (req.user.role === 'framer') {
    query = query.eq('user_id', req.user.id);
  } else if (user_id) {
    query = query.eq('user_id', user_id);
  }
  if (site_id) query = query.eq('site_id', site_id);
  if (from) query = query.gte('work_date', from);
  if (to) query = query.lte('work_date', to);

  const { data, error } = await query;
  if (error) throw error;


  res.json(data.map(({ photos, ...row }) => ({ ...row, photo_count: photos[0]?.count ?? 0 })));
});

/**
 * GET /api/submissions/:id
 * missing one, so the API doesn't reveal which IDs exist.
 *
 * @param {import('express').Request} req 
 * @param {import('express').Response} res - Sends the submission with
 *   `photos: [{ id, file_name, created_at, url }]`.
 */
router.get('/:id', async (req, res) => {
  const { id } = req.params;
  if (!isUuid(id)) return res.status(404).json({ error: 'Submission not found.' });

  const { data: submission, error } = await supabase
    .from('submissions')
    .select(`
      *,
      site:sites (id, name, address),
      worker:profiles (id, full_name),
      photos:submission_photos (id, storage_path, file_name, created_at)
    `)
    .eq('id', id)
    .maybeSingle();

  if (error) throw error;

  
  if (!submission || (req.user.role === 'framer' && submission.user_id !== req.user.id)) {
    return res.status(404).json({ error: 'Submission not found.' });
  }

  let photos = [];
  if (submission.photos.length > 0) {
    const { data: signed, error: signError } = await supabase.storage
      .from(BUCKET)
      .createSignedUrls(submission.photos.map((p) => p.storage_path), 60 * 60);
    if (signError) throw signError;

    photos = submission.photos.map((p, i) => ({
      id: p.id,
      file_name: p.file_name,
      created_at: p.created_at,
      url: signed[i]?.signedUrl ?? null,
    }));
  }

  res.json({ ...submission, photos });
});

/**
 * PATCH /api/submissions/:id/status
 *
 * Marks a submission as reviewed, or back to submitted. Admins only.
 *
 * @param {import('express').Request} req - `req.params.id`, and JSON body
 *   `{ status: 'submitted' | 'reviewed' }`.
 * @param {import('express').Response} res 
 */
router.patch('/:id/status', requireRole('admin'), async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  if (!isUuid(id)) return res.status(404).json({ error: 'Submission not found.' });
  if (!['submitted', 'reviewed'].includes(status)) {
    return res.status(400).json({ error: 'Status must be "submitted" or "reviewed".' });
  }

  const { data, error } = await supabase
    .from('submissions')
    .update({ status })
    .eq('id', id)
    .select('id, status')
    .maybeSingle();

  if (error) throw error;
  if (!data) return res.status(404).json({ error: 'Submission not found.' });

  res.json(data);
});

export default router;