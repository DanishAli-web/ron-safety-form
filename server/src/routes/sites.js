import { Router } from 'express';
import { supabase } from '../supabase.js';

const router = Router();

/**
 * @param {import('express').Request} req
 * @param {import('express').Response} res - Sends an array of `{ id, name, address }`.
 */
router.get('/', async (req, res) => {
  const { data, error } = await supabase
    .from('sites')
    .select('id, name, address')
    .order('name');

  if (error) throw error;
  res.json(data);
});

export default router;