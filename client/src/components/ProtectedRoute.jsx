import { Navigate } from 'react-router-dom';
import { useAuth, homePathFor } from '../context/AuthContext.jsx';

/**
 * Shows its page only to logged-in users with the right role, and redirects
 * everyone else: logged-out users to `/login`, users with the wrong role to
 * their own home page..
 *
 * @param {object} props
 * @param {'framer' | 'admin'} [props.role]
 * @param {import('react').ReactNode} props.children
 * @returns {JSX.Element}
 */
export default function ProtectedRoute({ role, children }) {
  const { profile, loading } = useAuth();

  if (loading) return <p className="page-status">Loading…</p>;
  if (!profile) return <Navigate to="/login" replace />;
  if (role && profile.role !== role) {
    return <Navigate to={homePathFor(profile.role)} replace />;
  }
  return children;
}