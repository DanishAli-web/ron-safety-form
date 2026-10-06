import { Router } from 'express';
import { supabase } from '../supabase.js';
import { isValidDate, todayUtc, addDays } from '../utils/validate.js';

const router = Router();

/**
 * GET /api/summary?date=YYYY-MM-DD
 *
 * @param {import('express').Request} req - Optional `req.query.date`.
 * @param {import('express').Response} res - Sends
 *   `{ date, from, to, submissionsPerSite, submitted, missing }`.
 */
router.get('/', async (req, res) => {
  const date = req.query.date || todayUtc();
  if (!isValidDate(date)) return res.status(400).json({ error: 'Invalid date.' });
  const from = addDays(date, -6);

  const [sitesResult, framersResult, weekResult] = await Promise.all([
    supabase.from('sites').select('id, name').order('name'),
    supabase.from('profiles').select('id, full_name').eq('role', 'framer').order('full_name'),
    supabase
      .from('submissions')
      .select('user_id, site_id, work_date')
      .gte('work_date', from)
      .lte('work_date', date),
  ]);

  for (const result of [sitesResult, framersResult, weekResult]) {
    if (result.error) throw result.error;
  }
  const sites = sitesResult.data;
  const framers = framersResult.data;
  const weekSubmissions = weekResult.data;

  // Submissions per site over the week (includes sites with zero)
  const submissionsPerSite = sites.map((site) => ({
    site_id: site.id,
    site_name: site.name,
    count: weekSubmissions.filter((s) => s.site_id === site.id).length,
  }));

  // Who has and hasn't submitted on the chosen date
  const submittedIds = new Set(
    weekSubmissions.filter((s) => s.work_date === date).map((s) => s.user_id),
  );
  const submitted = framers.filter((f) => submittedIds.has(f.id));
  const missing = framers.filter((f) => !submittedIds.has(f.id));

  res.json({ date, from, to: date, submissionsPerSite, submitted, missing });
});

export default router;