import { Router } from 'express';
import { supabase } from '../supabase.js';

const router = Router();

// GET /api/workers  (admins only) - framers, for the dashboard's worker filter
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