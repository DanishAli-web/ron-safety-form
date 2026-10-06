import { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase.js';
import { apiFetch } from '../lib/api.js';
/**
 * The logged-in user's profile, from GET /api/me.
 * @typedef {object} Profile
 * @property {string} id
 * @property {string} full_name
 * @property {'framer' | 'admin'} role
 */

/**
 * What {@link useAuth} returns.
 * @typedef {object} AuthValue
 * @property {Profile | null} profile - The logged-in user, or null if logged out.
 * @property {boolean} loading - True while the login state is still being checked.
 * @property {string | null} authError - A login problem to show on the login page.
 * @property {(email: string, password: string) => Promise<void>} signIn
 * @property {() => Promise<void>} signOut
 */

const AuthContext = createContext(null);

/**
 * The page a user lands on after logging in.
 *
 * @param {'framer' | 'admin'} role
 * @returns {string} `/admin` for admins, `/submit` for framers.
 */

export function homePathFor(role) {
  return role === 'admin' ? '/admin' : '/submit';
}

/**
 * Keeps track of who is logged in and shares it with the whole app.
 *
 *
 * @param {object} props
 * @param {import('react').ReactNode} props.children
 * @returns {JSX.Element}
 */


export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null); 
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState(null);

  useEffect(() => {
    const { data } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
      if (!newSession) {
        setProfile(null);
        setLoading(false);
      }
    });
    return () => data.subscription.unsubscribe();
  }, []);

  const userId = session?.user?.id;
  useEffect(() => {
    if (!userId) return;
    let cancelled = false;

    setLoading(true);
    apiFetch('/api/me')
      .then((me) => {
        if (!cancelled) setProfile(me);
      })
      .catch((err) => {
        if (cancelled) return;
        setAuthError(err.message);
        supabase.auth.signOut(); 
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [userId]);

  /**
   * Logs in with an email and password through Supabase Auth.
   *
   * @param {string} email
   * @param {string} password
   * @returns {Promise<void>}
   * @throws {Error} If the email or password is wrong.
   */

  async function signIn(email, password) {
    setAuthError(null);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw new Error('Incorrect email or password.');
  }

 /**
   * Logs out.
   *
   * @returns {Promise<void>}
   */

  async function signOut() {
    await supabase.auth.signOut();
  }

  return (
    <AuthContext.Provider value={{ profile, loading, authError, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}
/**
 * Gives a component access to the login state.
 *
 * @returns {AuthValue}
 * @throws {Error} If used outside {@link AuthProvider}.
 */
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used inside <AuthProvider>');
  return context;
}