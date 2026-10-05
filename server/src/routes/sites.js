import { Router } from 'express';
import { supabase } from '../supabase.js';

const router = Router();

// GET /api/sites - list of job sites for the form dropdown and dashboard filters
router.get('/', async (req, res) => {
  const { data, error } = await supabase
    .from('sites')
    .select('id, name, address')
    .order('name');

  if (error) throw error;
  res.json(data);
});

export default router;