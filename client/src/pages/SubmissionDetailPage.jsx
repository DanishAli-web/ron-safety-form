import { useEffect, useState } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import { apiFetch } from '../lib/api.js';
import { useAuth } from '../context/AuthContext.jsx';
import { formatDate } from '../utils/date.js';
import { CHECKLIST, CHECKLIST_NAMES } from '../constants/checklist.js';

// One submission: checklist answers, notes and photos.
// Used by both roles; the API only returns a framer's own submissions.
export default function SubmissionDetailPage() {
  const { id } = useParams();
  const { profile } = useAuth();
  const location = useLocation();
  const isAdmin = profile.role === 'admin';

  const [submission, setSubmission] = useState(null);
  const [error, setError] = useState(null);
  const [statusError, setStatusError] = useState(null);
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    apiFetch(`/api/submissions/${id}`)
      .then(setSubmission)
      .catch((err) => setError(err.message));
  }, [id]);

  // Go back to the list the user came from (keeping admin filters)
  const backTo = location.state?.backTo || (isAdmin ? '/admin' : '/my-submissions');

  async function toggleReviewed() {
    const nextStatus = submission.status === 'reviewed' ? 'submitted' : 'reviewed';
    setUpdating(true);
    setStatusError(null);
    try {
      const updated = await apiFetch(`/api/submissions/${id}/status`, {
        method: 'PATCH',
        body: { status: nextStatus },
      });
      setSubmission((current) => ({ ...current, status: updated.status }));
    } catch (err) {
      setStatusError(err.message);
    } finally {
      setUpdating(false);
    }
  }

  const backLink = (
    <Link to={backTo} className="back-link">
      Back to {isAdmin ? 'all submissions' : 'my forms'}
    </Link>
  );

  if (error) {
    return (
      <section className="page page-narrow">
        {backLink}
        <p className="alert alert-error" role="alert">
          {error}
        </p>
      </section>
    );
  }
  if (!submission) return <p className="page-status">Loading…</p>;

  const uncheckedCount = CHECKLIST_NAMES.filter((name) => !submission[name]).length;
  const submittedAt = new Date(submission.created_at).toLocaleTimeString('en-CA', {
    hour: 'numeric',
    minute: '2-digit',
  });

  return (
    <section className="page page-narrow">
      {backLink}

      <div className="detail-header">
        <div>
          <h1>{submission.site.name}</h1>
          <p className="muted">
            {formatDate(submission.work_date)}. Submitted by {submission.worker.full_name} at {submittedAt}.
          </p>
        </div>
        <span className={`status status-${submission.status}`}>
          {submission.status === 'reviewed' ? 'Reviewed' : 'Submitted'}
        </span>
      </div>

      {isAdmin && (
        <div className="detail-actions">
          <button type="button" className="button button-secondary" onClick={toggleReviewed} disabled={updating}>
            {submission.status === 'reviewed' ? 'Mark as not reviewed' : 'Mark as reviewed'}
          </button>
          {statusError && (
            <p className="field-error" role="alert">
              {statusError}
            </p>
          )}
        </div>
      )}

      {uncheckedCount > 0 && (
        <p className="alert alert-warning">
          {uncheckedCount} checklist {uncheckedCount === 1 ? 'item was' : 'items were'} not checked.
        </p>
      )}

      {CHECKLIST.map((group) => (
        <div key={group.title} className="detail-group">
          <h2>{group.title}</h2>
          <ul className="answer-list">
            {group.items.map((item) => {
              const checked = submission[item.name];
              return (
                <li key={item.name} className={checked ? 'answer-yes' : 'answer-no'}>
                  <span className="answer-mark" aria-hidden="true">
                    {checked ? '✓' : '✕'}
                  </span>
                  {item.label}
                  <span className="visually-hidden">{checked ? ': yes' : ': no'}</span>
                </li>
              );
            })}
          </ul>
        </div>
      ))}

      <div className="detail-group">
        <h2>Notes</h2>
        <p className={submission.notes ? 'notes' : 'muted'}>{submission.notes || 'No notes.'}</p>
      </div>

      <div className="detail-group">
        <h2>Photos</h2>
        {submission.photos.length === 0 ? (
          <p className="muted">No photos.</p>
        ) : (
          <ul className="photo-grid photo-grid-large">
            {submission.photos.map((photo) => (
              <li key={photo.id} className="photo-thumb">
                {/* Opens full size in a new tab. Links expire after an hour; reload the page for fresh ones. */}
                <a href={photo.url} target="_blank" rel="noreferrer">
                  <img src={photo.url} alt={photo.file_name} loading="lazy" />
                </a>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}