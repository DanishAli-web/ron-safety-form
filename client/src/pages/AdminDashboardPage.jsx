import { useEffect, useState } from 'react';
import { Link, useLocation, useSearchParams } from 'react-router-dom';
import { apiFetch } from '../lib/api.js';
import { formatDate } from '../utils/date.js';
import AdminSummary from '../components/AdminSummary.jsx';

export default function AdminDashboardPage() {
  // Filters live in the URL (?site_id=...&from=...), so they survive a page
  // refresh and the back button returns to the same filtered list.
  const [searchParams, setSearchParams] = useSearchParams();
  const location = useLocation();
  const filters = {
    site_id: searchParams.get('site_id') || '',
    user_id: searchParams.get('user_id') || '',
    from: searchParams.get('from') || '',
    to: searchParams.get('to') || '',
  };
  const hasFilters = Object.values(filters).some(Boolean);
  const rangeInvalid = filters.from && filters.to && filters.from > filters.to;

  const [sites, setSites] = useState([]);
  const [workers, setWorkers] = useState([]);
  const [submissions, setSubmissions] = useState(null); // null = loading
  const [error, setError] = useState(null);

  // Options for the filter dropdowns
  useEffect(() => {
    Promise.all([apiFetch('/api/sites'), apiFetch('/api/workers')])
      .then(([siteList, workerList]) => {
        setSites(siteList);
        setWorkers(workerList);
      })
      .catch((err) => setError(err.message));
  }, []);

  // Reload the table whenever the filters in the URL change
  const queryString = searchParams.toString();
  useEffect(() => {
    if (rangeInvalid) {
      setSubmissions([]);
      return;
    }
    let cancelled = false;
    setSubmissions(null);
    setError(null);

    apiFetch(`/api/submissions${queryString ? `?${queryString}` : ''}`)
      .then((data) => {
        if (!cancelled) setSubmissions(data);
      })
      .catch((err) => {
        if (!cancelled) setError(err.message);
      });

    // If filters change again before this request finishes, ignore its result
    return () => {
      cancelled = true;
    };
  }, [queryString, rangeInvalid]);

  function updateFilter(name, value) {
    const next = new URLSearchParams(searchParams);
    if (value) next.set(name, value);
    else next.delete(name);
    setSearchParams(next, { replace: true });
  }

  return (
    <section className="page">
      <h1>Safety forms</h1>

      <AdminSummary onSelectSite={(siteId) => updateFilter('site_id', siteId)} />

      <h2 className="section-heading">All submissions</h2>

      <div className="filters">
        <label className="field">
          <span className="field-label">Site</span>
          <select value={filters.site_id} onChange={(e) => updateFilter('site_id', e.target.value)}>
            <option value="">All sites</option>
            {sites.map((site) => (
              <option key={site.id} value={site.id}>
                {site.name}
              </option>
            ))}
          </select>
        </label>

        <label className="field">
          <span className="field-label">Worker</span>
          <select value={filters.user_id} onChange={(e) => updateFilter('user_id', e.target.value)}>
            <option value="">All workers</option>
            {workers.map((worker) => (
              <option key={worker.id} value={worker.id}>
                {worker.full_name}
              </option>
            ))}
          </select>
        </label>

        <label className="field">
          <span className="field-label">From</span>
          <input type="date" value={filters.from} onChange={(e) => updateFilter('from', e.target.value)} />
        </label>

        <label className="field">
          <span className="field-label">To</span>
          <input type="date" value={filters.to} onChange={(e) => updateFilter('to', e.target.value)} />
        </label>
      </div>

      <div className="results-bar">
        <p className="muted" aria-live="polite">
          {submissions && !rangeInvalid &&
            `${submissions.length} ${submissions.length === 1 ? 'form' : 'forms'}`}
        </p>
        {hasFilters && (
          <button type="button" className="link-button" onClick={() => setSearchParams({}, { replace: true })}>
            Clear filters
          </button>
        )}
      </div>

      {rangeInvalid && (
        <p className="alert alert-error" role="alert">
          The start date must be on or before the end date.
        </p>
      )}
      {error && (
        <p className="alert alert-error" role="alert">
          {error}
        </p>
      )}
      {!error && submissions === null && <p className="page-status">Loading…</p>}
      {!rangeInvalid && submissions?.length === 0 && (
        <p className="empty">No forms match these filters. Try a wider date range or clear the filters.</p>
      )}

      {submissions?.length > 0 && (
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th scope="col">Worker</th>
                <th scope="col">Site</th>
                <th scope="col">Date</th>
                <th scope="col">Photos</th>
                <th scope="col">Status</th>
              </tr>
            </thead>
            <tbody>
              {submissions.map((s) => (
                <tr key={s.id}>
                  <td>
                    <Link to={`/submissions/${s.id}`} state={{ backTo: `/admin${location.search}` }}>
                      {s.worker.full_name}
                    </Link>
                  </td>
                  <td>{s.site.name}</td>
                  <td>{formatDate(s.work_date)}</td>
                  <td>{s.photo_count}</td>
                  <td>
                    <span className={`status status-${s.status}`}>
                      {s.status === 'reviewed' ? 'Reviewed' : 'Submitted'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}