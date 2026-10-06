/**
 * Today's date in the user's own time zone, as YYYY-MM-DD.
 *
 * @returns {string}
 */
export function localToday() {
  const now = new Date();
  const offsetMs = now.getTimezoneOffset() * 60 * 1000;
  return new Date(now.getTime() - offsetMs).toISOString().slice(0, 10);
}
/**
 * Formats a YYYY-MM-DD date for display. 
 *
 * @param {string} ymd 
 * @returns {string}
 */
export function formatDate(ymd) {
  return new Date(`${ymd}T00:00:00`).toLocaleDateString('en-CA', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}