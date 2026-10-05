import { supabase } from '../supabase.js';

// Checks the "Authorization: Bearer <token>" header, confirms the token with
// Supabase, then loads the user's profile so routes can use req.user.
export async function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;

  if (!token) {
    return res.status(401).json({ error: 'You need to log in.' });
  }

  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data.user) {
    console.error('getUser failed:', error?.message);
    return res.status(401).json({ error: 'Your session has expired. Please log in again.' });
  }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('id, full_name, role')
    .eq('id', data.user.id)
    .single();

  if (profileError || !profile) {
    return res.status(403).json({ error: 'No profile found for this account.' });
  }

  req.user = profile; // { id, full_name, role }
  next();
}

// Use after requireAuth, e.g. router.get('/', requireAuth, requireRole('admin'), ...)
export function requireRole(role) {
  return (req, res, next) => {
    if (req.user.role !== role) {
      return res.status(403).json({ error: 'You do not have permission to do that.' });
    }
    next();
  };
}