import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!url || !anonKey) {
  throw new Error('Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY in .env');
}

/**
 * Browser Supabase client, using the public publishable key.
 *
 * @type {import('@supabase/supabase-js').SupabaseClient}
 */
export const supabase = createClient(url, anonKey);