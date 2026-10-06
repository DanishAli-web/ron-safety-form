import { supabase } from '../supabase.js';

/**
 * A user's app profile, from the profiles table.
 *
 * @typedef {object} Profile
 * @property {string} id - Same ID as the user's Supabase login (auth.users.id).
 * @property {string} full_name
 * @property {'framer' | 'admin'} role
 */
 
/**
 * Express middleware that requires a valid login.
 * Reads the `Authorization: Bearer <token>` header.
 * Responds 401 if the token is missing, invalid or expired, and 403 if the
 * login has no profile.
 *
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 * @returns {Promise<void>}
 */
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

/**
 * Creates middleware that only lets users with the given role through.
 * Must run after {@link requireAuth}, which sets `req.user`. Responds 403 otherwise.
 *
 * @param {'framer' | 'admin'} role - The role required.
 * @returns {import('express').RequestHandler} The middleware.
 */

export function requireRole(role) {
  return (req, res, next) => {
    if (req.user.role !== role) {
      return res.status(403).json({ error: 'You do not have permission to do that.' });
    }
    next();
  };
}