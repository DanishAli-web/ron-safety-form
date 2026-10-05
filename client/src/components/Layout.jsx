import { NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import Logo from './Logo.jsx';

export default function Layout() {
  const { profile, signOut } = useAuth();

  const links =
    profile.role === 'admin'
      ? [{ to: '/admin', label: 'Dashboard' }]
      : [
          { to: '/submit', label: 'New form' },
          { to: '/my-submissions', label: 'My forms' },
        ];

  return (
    <div className="app">
      <header className="app-header">
        <div className="app-header-inner">
          <Logo />
          <nav className="app-nav" aria-label="Main">
            {links.map((link) => (
              <NavLink key={link.to} to={link.to}>
                {link.label}
              </NavLink>
            ))}
          </nav>
          <div className="app-user">
            <span className="app-user-name">{profile.full_name}</span>
            <button type="button" className="link-button" onClick={signOut}>
              Log out
            </button>
          </div>
        </div>
      </header>
      <main className="app-main">
        <Outlet />
      </main>
    </div>
  );
}