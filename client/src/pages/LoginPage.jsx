import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth, homePathFor } from '../context/AuthContext.jsx';
import Logo from '../components/Logo.jsx';

export default function LoginPage() {
  const { profile, loading, authError, signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  // Already logged in? Go straight to the right home page.
  if (profile) return <Navigate to={homePathFor(profile.role)} replace />;

  async function handleSubmit(event) {
    event.preventDefault();
    setError(null);

    if (!email.trim() || !password) {
      setError('Enter your email and password.');
      return;
    }

    setSubmitting(true);
    try {
      await signIn(email.trim(), password);
      // AuthContext loads the profile, and the redirect above takes over
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  const message = error || authError;

  return (
    <div className="login">
      <div className="login-brand">
        <Logo />
      </div>
      <form className="login-card" onSubmit={handleSubmit} noValidate>
        <h1>Site safety forms</h1>
        <p className="muted">Log in with your RAS account.</p>

        {message && (
          <p className="alert alert-error" role="alert">
            {message}
          </p>
        )}

        <label className="field">
          <span className="field-label">Email</span>
          <input
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </label>

        <label className="field">
          <span className="field-label">Password</span>
          <input
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </label>

        <button type="submit" className="button button-primary button-block" disabled={submitting || loading}>
          {submitting ? 'Logging in…' : 'Log in'}
        </button>
      </form>
    </div>
  );
}