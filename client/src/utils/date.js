// Today's date in the user's own timezone, as YYYY-MM-DD.
// (new Date().toISOString() would give the UTC date, which is "tomorrow"
// in BC after 5pm.)
export function localToday() {
  const now = new Date();
  const offsetMs = now.getTimezoneOffset() * 60 * 1000;
  return new Date(now.getTime() - offsetMs).toISOString().slice(0, 10);
}

// "2026-10-01" -> "Thu, Oct 1, 2026"
export function formatDate(ymd) {
  return new Date(`${ymd}T00:00:00`).toLocaleDateString('en-CA', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}