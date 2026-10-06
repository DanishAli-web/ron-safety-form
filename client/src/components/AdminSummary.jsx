import { useEffect, useState } from 'react';
import { apiFetch } from '../lib/api.js';
import { localToday } from '../utils/date.js';

/**
 * Top of the admin dashboard: who has and hasn't submitted today, and a bar
 * chart of forms per site over the last 7 days. Sends the admin's local date
 * so "today" matches BC time rather than the server's UTC.
 *
 * @param {object} props
 * @param {(siteId: string) => void} props.onSelectSite 
 * @returns {JSX.Element}
 */
export default function AdminSummary({ onSelectSite }) {
  const [summary, setSummary] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    apiFetch(`/api/summary?date=${localToday()}`)
      .then(setSummary)
      .catch((err) => setError(err.message));
  }, []);

  if (error) {
    return (
      <p className="alert alert-error" role="alert">
        Could not load the summary: {error}
      </p>
    );
  }
  if (!summary) return <p className="page-status">Loading summary…</p>;

  const { submitted, missing, submissionsPerSite } = summary;
  const totalFramers = submitted.length + missing.length;
  const maxCount = Math.max(1, ...submissionsPerSite.map((site) => site.count));

  return (
    <div className="summary">
      <section className="summary-card">
        <h2>Today</h2>
        <p className="summary-stat">
          <strong>{submitted.length}</strong> of {totalFramers} framers have submitted
        </p>

        {missing.length === 0 ? (
          <p className="muted">Everyone has submitted today.</p>
        ) : (
          <>
            <h3>Not submitted yet</h3>
            <ul className="name-list">
              {missing.map((worker) => (
                <li key={worker.id}>{worker.full_name}</li>
              ))}
            </ul>
          </>
        )}
      </section>

      <section className="summary-card">
        <h2>Forms per site, last 7 days</h2>
        <ul className="bar-chart">
          {submissionsPerSite.map((site) => (
            <li key={site.site_id}>
              <button
                type="button"
                className="bar-row"
                onClick={() => onSelectSite(site.site_id)}
                aria-label={`${site.site_name}: ${site.count} forms. Show these forms.`}
              >
                <span className="bar-label">{site.site_name}</span>
                <span className="bar-track">
                  <span className="bar-fill" style={{ width: `${(site.count / maxCount) * 100}%` }} />
                </span>
                <span className="bar-value">{site.count}</span>
              </button>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}