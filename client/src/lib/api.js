import { supabase } from './supabase.js';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

/**
 * Calls the Express API with the logged-in user's token attached.
 *
 * Plain objects in `options.body` are sent as JSON. FormData is sent as is,
 * so the browser can set its own Content-Type.
 *
 * @param {string} path - API path, such as `/api/sites`.
 * @param {object} [options] - Options passed on to `fetch`.
 * @param {string} [options.method] - HTTP method; defaults to GET.
 * @param {object | FormData} [options.body] - Request body.
 * @param {Record<string, string>} [options.headers] - Extra headers.
 * @returns {Promise<any>} The parsed JSON response.
 * @throws {Error} 
 */

export async function apiFetch(path, options = {}) {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;

  const headers = { ...options.headers };
  if (token) headers.Authorization = `Bearer ${token}`;

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