import { Navigate, Route, Routes } from 'react-router-dom';
import { useAuth, homePathFor } from './context/AuthContext.jsx';
import ProtectedRoute from './components/ProtectedRoute.jsx';
import Layout from './components/Layout.jsx';
import LoginPage from './pages/LoginPage.jsx';
import NewSubmissionPage from './pages/NewSubmissionPage.jsx';
import MySubmissionsPage from './pages/MySubmissionsPage.jsx';
import AdminDashboardPage from './pages/AdminDashboardPage.jsx';

// Sends "/" to the right home page for the logged-in user
function HomeRedirect() {
  const { profile, loading } = useAuth();
  if (loading) return <p className="page-status">Loading…</p>;
  return <Navigate to={profile ? homePathFor(profile.role) : '/login'} replace />;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />

      {/* Everything inside here requires a login and shares the header */}
      <Route
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route
          path="/submit"
          element={
            <ProtectedRoute role="framer">
              <NewSubmissionPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/my-submissions"
          element={
            <ProtectedRoute role="framer">
              <MySubmissionsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin"
          element={
            <ProtectedRoute role="admin">
              <AdminDashboardPage />
            </ProtectedRoute>
          }
        />
      </Route>

      <Route path="*" element={<HomeRedirect />} />
    </Routes>
  );
}