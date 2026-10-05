import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiFetch } from '../lib/api.js';
import { supabase } from '../lib/supabase.js';
import { useAuth } from '../context/AuthContext.jsx';
import { formatDate, localToday } from '../utils/date.js';
import { CHECKLIST, CHECKLIST_NAMES } from '../constants/checklist.js';

const EMPTY_CHECKLIST = Object.fromEntries(CHECKLIST_NAMES.map((name) => [name, false]));

// Same limits as the API
const MAX_PHOTOS = 5;
const MAX_PHOTO_SIZE = 5 * 1024 * 1024;
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const PHOTO_BUCKET = 'submission-photos';

export default function NewSubmissionPage() {
  const { profile } = useAuth();

  const [sites, setSites] = useState([]);
  const [sitesError, setSitesError] = useState(null);

  const [siteId, setSiteId] = useState('');
  const [workDate, setWorkDate] = useState(localToday());
  const [checklist, setChecklist] = useState(EMPTY_CHECKLIST);
  const [notes, setNotes] = useState('');
  // [{ id, file, path }]. `path` is set once the photo is uploaded to Storage,
  // so a retry after a failed submit doesn't upload it again.
  const [photos, setPhotos] = useState([]);
  const nextPhotoId = useRef(1);

  const [fieldErrors, setFieldErrors] = useState({});
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [progress, setProgress] = useState(''); // e.g. "Uploading photo 2 of 3…"
  const [submitted, setSubmitted] = useState(null); // { siteName, workDate } after success

  useEffect(() => {
    apiFetch('/api/sites')
      .then(setSites)
      .catch((err) => setSitesError(err.message));
  }, []);

  function toggleItem(name) {
    setChecklist((current) => ({ ...current, [name]: !current[name] }));
  }

  function handleAddPhotos(event) {
    const chosen = Array.from(event.target.files);
    event.target.value = ''; // so choosing the same file again still triggers onChange

    const accepted = [];
    let problem = null;
    for (const file of chosen) {
      if (!ALLOWED_TYPES.includes(file.type)) {
        problem = `${file.name} isn't a JPG, PNG or WebP image.`;
      } else if (file.size > MAX_PHOTO_SIZE) {
        problem = `${file.name} is larger than 5 MB.`;
      } else if (photos.length + accepted.length >= MAX_PHOTOS) {
        problem = `You can attach up to ${MAX_PHOTOS} photos.`;
      } else {
        accepted.push({ id: nextPhotoId.current++, file });
      }
    }

    setPhotos((current) => [...current, ...accepted]);
    setFieldErrors((current) => ({ ...current, photos: problem }));
  }

  function removePhoto(id) {
    setPhotos((current) => current.filter((photo) => photo.id !== id));
  }

  function validate() {
    const errors = {};
    if (!siteId) errors.site = 'Choose the job site you are working on.';
    if (!workDate) errors.date = 'Choose a date.';
    if (photos.length === 0) errors.photos = 'Add at least one photo.';
    return errors;
  }

  function resetForm() {
    setSiteId('');
    setWorkDate(localToday());
    setChecklist(EMPTY_CHECKLIST);
    setNotes('');
    setPhotos([]);
    setFieldErrors({});
    setError(null);
  }

  // Uploads any photos that aren't in Storage yet, straight from the browser.
  // The API only hands out upload tokens; the photo data never goes through it.
  // Returns the photo list with every `path` filled in.
  async function uploadMissingPhotos() {
    const pending = photos.filter((photo) => !photo.path);
    if (pending.length === 0) return photos;

    setProgress('Preparing photos…');
    const { uploads } = await apiFetch('/api/uploads', {
      method: 'POST',
      body: { files: pending.map((photo) => ({ type: photo.file.type, size: photo.file.size })) },
    });

    const paths = {};
    for (let i = 0; i < pending.length; i++) {
      setProgress(`Uploading photo ${i + 1} of ${pending.length}…`);
      const { path, token } = uploads[i];
      const photo = pending[i];

      const { error } = await supabase.storage
        .from(PHOTO_BUCKET)
        .uploadToSignedUrl(path, token, photo.file, { contentType: photo.file.type });
      if (error) {
        throw new Error(`Photo ${i + 1} could not be uploaded. Check your connection and try again.`);
      }

      // Remember the path straight away, so photos that finished uploading
      // aren't sent again if a later one fails
      paths[photo.id] = path;
      setPhotos((current) => current.map((p) => (p.id === photo.id ? { ...p, path } : p)));
    }

    return photos.map((photo) => (paths[photo.id] ? { ...photo, path: paths[photo.id] } : photo));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError(null);

    const errors = validate();
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) {
      setError('Some details are missing. Check the highlighted fields.');
      return;
    }

    setSubmitting(true);
    try {
      // 1. Upload the photos directly to Storage
      const uploaded = await uploadMissingPhotos();

      // 2. Submit the form as JSON, with the photos' paths
      setProgress('Submitting…');
      await apiFetch('/api/submissions', {
        method: 'POST',
        body: {
          site_id: siteId,
          work_date: workDate,
          ...checklist,
          notes: notes.trim() || null,
          photos: uploaded.map((photo) => ({
            path: photo.path,
            file_name: photo.file.name.slice(0, 255),
          })),
        },
      });

      const siteName = sites.find((site) => site.id === siteId)?.name;
      resetForm();
      setSubmitted({ siteName, workDate });
      window.scrollTo(0, 0);
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
      setProgress('');
    }
  }

  if (submitted) {
    return (
      <section className="page page-narrow">
        <div className="success-panel" role="status">
          <h1>Safety form submitted</h1>
          <p>
            {submitted.siteName}, {formatDate(submitted.workDate)}
          </p>
          <div className="button-row">
            <button type="button" className="button button-primary" onClick={() => setSubmitted(null)}>
              Fill out another form
            </button>
            <Link to="/my-submissions" className="button button-secondary">
              View my forms
            </Link>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="page page-narrow">
      <h1>Daily safety form</h1>
      <p className="muted">Submitting as {profile.full_name}</p>

      {error && (
        <p className="alert alert-error" role="alert">
          {error}
        </p>
      )}

      <form onSubmit={handleSubmit} noValidate className="safety-form">
        <div className="form-row">
          <label className="field">
            <span className="field-label">Job site</span>
            <select
              value={siteId}
              onChange={(e) => setSiteId(e.target.value)}
              aria-invalid={Boolean(fieldErrors.site)}
              aria-describedby={fieldErrors.site ? 'site-error' : undefined}
            >
              <option value="">Choose a site</option>
              {sites.map((site) => (
                <option key={site.id} value={site.id}>
                  {site.name}
                </option>
              ))}
            </select>
            {sitesError && <span className="field-error">Could not load sites: {sitesError}</span>}
            {fieldErrors.site && (
              <span id="site-error" className="field-error">
                {fieldErrors.site}
              </span>
            )}
          </label>

          <label className="field">
            <span className="field-label">Date</span>
            <input
              type="date"
              value={workDate}
              onChange={(e) => setWorkDate(e.target.value)}
              aria-invalid={Boolean(fieldErrors.date)}
              aria-describedby={fieldErrors.date ? 'date-error' : undefined}
            />
            {fieldErrors.date && (
              <span id="date-error" className="field-error">
                {fieldErrors.date}
              </span>
            )}
          </label>
        </div>

        {CHECKLIST.map((group) => (
          <fieldset key={group.title} className="checklist">
            <legend>{group.title}</legend>
            {group.items.map((item) => (
              <label key={item.name} className="check-row">
                <input
                  type="checkbox"
                  checked={checklist[item.name]}
                  onChange={() => toggleItem(item.name)}
                />
                <span>{item.label}</span>
              </label>
            ))}
          </fieldset>
        ))}

        <label className="field">
          <span className="field-label">Notes</span>
          <textarea
            rows={4}
            maxLength={2000}
            placeholder="Anything the supervisor should know, such as hazards or missing equipment"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </label>

        <div className="field">
          <span className="field-label" id="photos-label">
            Photos
          </span>
          <span className="field-hint">
            Site conditions, PPE or hazards. Up to {MAX_PHOTOS} photos, 5 MB each.
          </span>

          {photos.length > 0 && (
            <ul className="photo-grid">
              {photos.map((photo) => (
                <PhotoThumb key={photo.id} file={photo.file} onRemove={() => removePhoto(photo.id)} />
              ))}
            </ul>
          )}

          {photos.length < MAX_PHOTOS && (
            <label className="button button-secondary photo-add">
              {photos.length === 0 ? 'Add photos' : 'Add more photos'}
              <input
                type="file"
                accept={ALLOWED_TYPES.join(',')}
                multiple
                onChange={handleAddPhotos}
                aria-labelledby="photos-label"
                aria-describedby={fieldErrors.photos ? 'photos-error' : undefined}
                className="visually-hidden"
              />
            </label>
          )}
          {fieldErrors.photos && (
            <span id="photos-error" className="field-error">
              {fieldErrors.photos}
            </span>
          )}
        </div>

        <div className="submit-bar">
          <button type="submit" className="button button-primary button-block" disabled={submitting}>
            {submitting ? progress || 'Submitting…' : 'Submit safety form'}
          </button>
        </div>
      </form>
    </section>
  );
}

// Shows a preview of a chosen photo. The temporary preview URL is
// released when the thumbnail is removed, to avoid leaking memory.
function PhotoThumb({ file, onRemove }) {
  const [url, setUrl] = useState(null);

  useEffect(() => {
    const objectUrl = URL.createObjectURL(file);
    setUrl(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [file]);

  return (
    <li className="photo-thumb">
      {url && <img src={url} alt={file.name} />}
      <button type="button" className="photo-remove" onClick={onRemove} aria-label={`Remove ${file.name}`}>
        Remove
      </button>
    </li>
  );
}