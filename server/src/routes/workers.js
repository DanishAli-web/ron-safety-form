import { Router } from 'express';
import { supabase } from '../supabase.js';

const router = Router();

/**
 * GET /api/workers
 *
 * Lists all framers, sorted by name, for the dashboard's worker filter. Admins only.
 *
 * @param {import('express').Request} req
 * @param {import('express').Response} res - Sends an array of `{ id, full_name }`.
 */
router.get('/', async (req, res) => {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, full_name')
    .eq('role', 'framer')
    .order('full_name');

  if (error) throw error;
  res.json(data);
});

export default router;