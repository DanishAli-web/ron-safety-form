import { supabase } from './supabase.js';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

// Calls our Express API with the user's login token attached.
// Throws an Error with a readable message if anything goes wrong.
export async function apiFetch(path, options = {}) {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;

  const headers = { ...options.headers };
  if (token) headers.Authorization = `Bearer ${token}`;

  // FormData (photo uploads) sets its own Content-Type; plain objects are sent as JSON
  let body = options.body;
  if (body && !(body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
    body = JSON.stringify(body);
  }

  let response;
  try {
    response = await fetch(`${API_URL}${path}`, { ...options, headers, body });
  } catch {
    throw new Error('Could not reach the server. Check your connection and try again.');
  }

  const result = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(result?.error || `Request failed (${response.status}).`);
  }
  return result;
}