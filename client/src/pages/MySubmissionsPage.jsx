import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiFetch } from '../lib/api.js';
import { formatDate } from '../utils/date.js';

export default function MySubmissionsPage() {
  const [submissions, setSubmissions] = useState(null); // null = still loading
  const [error, setError] = useState(null);

  useEffect(() => {
    apiFetch('/api/submissions')
      .then(setSubmissions)
      .catch((err) => setError(err.message));
  }, []);

  return (
    <section className="page page-narrow">
      <h1>My forms</h1>

      {error && (
        <p className="alert alert-error" role="alert">
          {error}
        </p>
      )}

      {!error && submissions === null && <p className="page-status">Loading…</p>}

      {submissions?.length === 0 && (
        <div className="empty">
          <p>You haven't submitted any safety forms yet.</p>
          <Link to="/submit" className="button button-primary">
            Fill out today's form
          </Link>
        </div>
      )}

      {submissions?.length > 0 && (
        <ul className="submission-list">
          {submissions.map((s) => (
            <li key={s.id}>
              <Link to={`/submissions/${s.id}`} className="submission-item">
                <div>
                  <p className="submission-site">{s.site.name}</p>
                  <p className="muted">
                    {formatDate(s.work_date)}, {s.photo_count} {s.photo_count === 1 ? 'photo' : 'photos'}
                  </p>
                </div>
                <span className={`status status-${s.status}`}>
                  {s.status === 'reviewed' ? 'Reviewed' : 'Submitted'}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}