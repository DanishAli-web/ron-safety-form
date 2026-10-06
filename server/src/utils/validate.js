const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * @param {unknown} value
 * @returns {boolean}
 */
export function isUuid(value) {
  return typeof value === 'string' && UUID_RE.test(value);
}

/**
 * Checks whether a value is a real calendar date in YYYY-MM-DD form.
 *
 * @param {unknown} value
 * @returns {boolean}
 */
export function isValidDate(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}
/**
 * Today's date on the server, in UTC, as YYYY-MM-DD.
 *
 * @returns {string}
 */
export function todayUtc() {
  return new Date().toISOString().slice(0, 10);
}
/**
 * @param {string} dateStr 
 * @param {number} days 
 * @returns {string} 
 */

export function addDays(dateStr, days) {
  const date = new Date(`${dateStr}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}