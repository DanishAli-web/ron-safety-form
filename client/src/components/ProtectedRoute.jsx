import { Navigate } from 'react-router-dom';
import { useAuth, homePathFor } from '../context/AuthContext.jsx';

// Only renders its children for logged-in users (and, if given, the right role).
// This is for navigation only: the API enforces the real permissions.
export default function ProtectedRoute({ role, children }) {
  const { profile, loading } = useAuth();

  if (loading) return <p className="page-status">Loading…</p>;
  if (!profile) return <Navigate to="/login" replace />;
  if (role && profile.role !== role) {
    return <Navigate to={homePathFor(profile.role)} replace />;
  }
  return children;
}